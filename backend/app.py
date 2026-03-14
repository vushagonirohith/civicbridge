from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import hashlib
import base64
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app,
     origins=["*"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')                          # anon key — DB queries
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', SUPABASE_KEY)  # service role — Storage

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)             # for DB
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)  # for Storage uploads

# ============= AUTH ROUTES =============

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        password = data.get('password', '')

        if not email or not name or not password:
            return jsonify({'success': False, 'error': 'Missing fields'}), 400
        if len(password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400

        password_hash = hashlib.sha256(password.encode()).hexdigest()

        existing = supabase.table('users').select('id').eq('email', email).execute()
        if existing.data:
            return jsonify({'success': False, 'error': 'Email already registered'}), 409

        response = supabase.table('users').insert({
            'email': email, 'name': name,
            'password_hash': password_hash, 'role': 'user'
        }).execute()

        return jsonify({'success': True, 'user': {
            'id': response.data[0]['id'], 'email': email, 'name': name, 'role': 'user'
        }}), 201

    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'success': False, 'error': 'Missing fields'}), 400

        password_hash = hashlib.sha256(password.encode()).hexdigest()
        response = supabase.table('users').select('*').eq('email', email).execute()

        if not response.data:
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

        user = response.data[0]
        if user['password_hash'] != password_hash:
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

        return jsonify({'success': True, 'user': {
            'id': user['id'], 'email': user['email'],
            'name': user['name'], 'role': user['role']
        }}), 200

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        admin_email = os.getenv('ADMIN_EMAIL', '').strip().lower()
        admin_password = os.getenv('ADMIN_PASSWORD', '')

        if not admin_email or not admin_password:
            return jsonify({'success': False, 'error': 'Admin credentials not configured'}), 500
        if email != admin_email or password != admin_password:
            return jsonify({'success': False, 'error': 'Invalid admin credentials'}), 401

        return jsonify({'success': True, 'user': {
            'id': 'admin-001', 'email': admin_email,
            'name': os.getenv('ADMIN_NAME', 'Administrator'), 'role': 'admin'
        }}), 200

    except Exception as e:
        print(f"Admin login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============= REPORT ROUTES =============

@app.route('/api/reports', methods=['POST'])
def create_report():
    try:
        data = request.json
        # Do NOT log data — contains base64 photos, causes timeout
        print(f"Creating report: user={data.get('userId')}, photos={len(data.get('photos', []))}")

        user_id = data.get('userId')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID required'}), 400

        # Insert report
        response = supabase.table('reports').insert({
            'user_id': user_id,
            'issue_type': data.get('issueType'),
            'description': data.get('description'),
            'latitude': data.get('location', {}).get('lat') if data.get('location') else None,
            'longitude': data.get('location', {}).get('lng') if data.get('location') else None,
            'address': data.get('address'),
            'status': 'pending'
        }).execute()

        report_id = response.data[0]['id']
        print(f"Report inserted: {report_id}")

        # Upload photos using service role client (bypasses RLS)
        photos = data.get('photos', [])
        if photos:
            print(f"Uploading {len(photos)} photo(s)...")
            for idx, photo_b64 in enumerate(photos[:5]):
                try:
                    raw = photo_b64.split(',')[1] if ',' in photo_b64 else photo_b64
                    photo_bytes = base64.b64decode(raw)
                    filename = f"{report_id}/photo_{idx}_{int(datetime.now().timestamp())}.jpg"

                    # Use supabase_admin (service role) for storage upload
                    supabase_admin.storage.from_('report-photos').upload(
                        filename, photo_bytes, {'content-type': 'image/jpeg'}
                    )

                    url_result = supabase_admin.storage.from_('report-photos').get_public_url(filename)
                    # Handle both string response (old SDK) and object response (new SDK)
                    public_url = url_result if isinstance(url_result, str) else (
                        url_result.get('publicUrl') or url_result.get('public_url') or str(url_result)
                    )

                    # Save URL to DB — column is photo_data
                    supabase.table('report_photos').insert({
                        'report_id': report_id,
                        'photo_data': public_url
                    }).execute()

                    print(f"Photo {idx} saved: {public_url}")

                except Exception as e:
                    print(f"Photo {idx} failed: {e}")

        return jsonify({'success': True, 'reportId': report_id}), 201

    except Exception as e:
        print(f"Create report error: {e}")
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reports/user/<user_id>', methods=['GET'])
def get_user_reports(user_id):
    try:
        response = supabase.table('reports').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()

        reports = []
        for report in response.data:
            photos_response = supabase.table('report_photos').select('*').eq('report_id', report['id']).execute()
            photos = [p['photo_data'] for p in photos_response.data if p.get('photo_data')]

            comments_response = supabase.table('admin_comments').select('*').eq('report_id', report['id']).order('created_at', desc=False).execute()

            reports.append({
                'id': report['id'],
                'issueType': report['issue_type'],
                'description': report['description'],
                'location': {'lat': report['latitude'], 'lng': report['longitude']},
                'address': report['address'],
                'photos': photos,
                'status': report['status'],
                'comments': comments_response.data,
                'timestamp': report['created_at']
            })

        return jsonify({'success': True, 'reports': reports}), 200

    except Exception as e:
        print(f"Get user reports error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reports', methods=['GET'])
def get_all_reports():
    try:
        response = supabase.table('reports').select('*').order('created_at', desc=True).execute()

        reports = []
        for report in response.data:
            user_response = supabase.table('users').select('id, name, email').eq('id', report['user_id']).execute()
            user = user_response.data[0] if user_response.data else {}

            photos_response = supabase.table('report_photos').select('*').eq('report_id', report['id']).execute()
            photos = [p['photo_data'] for p in photos_response.data if p.get('photo_data')]

            comments_response = supabase.table('admin_comments').select('*').eq('report_id', report['id']).order('created_at', desc=False).execute()

            reports.append({
                'id': report['id'],
                'userId': report['user_id'],
                'userName': user.get('name', 'Unknown'),
                'userEmail': user.get('email', 'Unknown'),
                'issueType': report['issue_type'],
                'description': report['description'],
                'location': {'lat': report['latitude'], 'lng': report['longitude']},
                'address': report['address'],
                'photos': photos,
                'status': report['status'],
                'comments': comments_response.data,
                'timestamp': report['created_at']
            })

        return jsonify({'success': True, 'reports': reports}), 200

    except Exception as e:
        print(f"Get all reports error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reports/<report_id>/status', methods=['PUT'])
def update_report_status(report_id):
    try:
        data = request.json
        status = data.get('status')
        if status not in {'pending', 'in_progress', 'resolved'}:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400
        supabase.table('reports').update({'status': status}).eq('id', report_id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reports/<report_id>/comment', methods=['POST'])
def add_comment(report_id):
    try:
        data = request.json
        comment = (data.get('comment') or '').strip()
        if not comment:
            return jsonify({'success': False, 'error': 'Comment cannot be empty'}), 400
        supabase.table('admin_comments').insert({
            'report_id': report_id,
            'admin_id': data.get('adminId', 'admin-001'),
            'comment_text': comment
        }).execute()
        return jsonify({'success': True}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    try:
        photos_response = supabase.table('report_photos').select('photo_data').eq('report_id', report_id).execute()
        for photo in photos_response.data:
            url = photo.get('photo_data', '')
            if url and 'report-photos' in url:
                try:
                    path = url.split('/report-photos/')[1]
                    supabase_admin.storage.from_('report-photos').remove([path])
                except Exception as e:
                    print(f"Storage delete failed: {e}")

        supabase.table('report_photos').delete().eq('report_id', report_id).execute()
        supabase.table('admin_comments').delete().eq('report_id', report_id).execute()
        supabase.table('reports').delete().eq('id', report_id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============= HEALTH CHECK =============

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()}), 200


@app.before_request
def log_request():
    print(f"[{request.method}] {request.path}")


if __name__ == '__main__':
    app.run(debug=True, port=5000)