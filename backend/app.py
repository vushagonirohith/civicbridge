from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import hashlib
import base64  # ← was missing, caused photo upload to crash
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app,
     origins=["*"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

        # Check if email already exists
        existing = supabase.table('users').select('id').eq('email', email).execute()
        if existing.data:
            return jsonify({'success': False, 'error': 'Email already registered'}), 409

        response = supabase.table('users').insert({
            'email': email,
            'name': name,
            'password_hash': password_hash,
            'role': 'user'
        }).execute()

        return jsonify({
            'success': True,
            'user': {
                'id': response.data[0]['id'],
                'email': email,
                'name': name,
                'role': 'user'
            }
        }), 201

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

        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'role': user['role']
            }
        }), 200

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    """
    Admin login — reads admin credentials from environment variables.
    Set ADMIN_EMAIL and ADMIN_PASSWORD in your Render env vars.
    """
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        admin_email = os.getenv('ADMIN_EMAIL', '').strip().lower()
        admin_password = os.getenv('ADMIN_PASSWORD', '')

        if not admin_email or not admin_password:
            return jsonify({'success': False, 'error': 'Admin credentials not configured on server'}), 500

        if email != admin_email or password != admin_password:
            return jsonify({'success': False, 'error': 'Invalid admin credentials'}), 401

        return jsonify({
            'success': True,
            'user': {
                'id': 'admin-001',
                'email': admin_email,
                'name': os.getenv('ADMIN_NAME', 'Administrator'),
                'role': 'admin'
            }
        }), 200

    except Exception as e:
        print(f"Admin login error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============= REPORT ROUTES =============

@app.route('/api/reports', methods=['POST'])
def create_report():
    try:
        data = request.json
        print(f"Creating report: {data}")

        user_id = data.get('userId')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID required'}), 400

        report_data = {
            'user_id': user_id,
            'issue_type': data.get('issueType'),
            'description': data.get('description'),
            'latitude': data.get('location', {}).get('lat') if data.get('location') else None,
            'longitude': data.get('location', {}).get('lng') if data.get('location') else None,
            'address': data.get('address'),
            'status': 'pending'
        }

        response = supabase.table('reports').insert(report_data).execute()
        report_id = response.data[0]['id']

        # Upload photos to Supabase Storage
        photos = data.get('photos', [])
        photo_urls = []
        if photos:
            print(f"Uploading {len(photos)} photos...")
            for idx, photo_data in enumerate(photos[:5]):  # max 5
                try:
                    # Strip base64 prefix if present
                    if ',' in photo_data:
                        photo_data = photo_data.split(',')[1]

                    photo_bytes = base64.b64decode(photo_data)
                    filename = f"{report_id}/photo_{idx}_{int(datetime.now().timestamp())}.jpg"

                    supabase.storage.from_('report-photos').upload(
                        filename,
                        photo_bytes,
                        {'content-type': 'image/jpeg'}
                    )

                    public_url = supabase.storage.from_('report-photos').get_public_url(filename)
                    photo_urls.append(public_url)
                    print(f"Photo {idx} uploaded: {public_url}")

                except Exception as photo_error:
                    print(f"Photo {idx} upload failed: {photo_error}")

            # Save photo URLs to DB
            for url in photo_urls:
                supabase.table('report_photos').insert({
                    'report_id': report_id,
                    'photo_url': url
                }).execute()

        print(f"Report created: {report_id}")
        return jsonify({'success': True, 'reportId': report_id}), 201

    except Exception as e:
        print(f"Create report error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reports/user/<user_id>', methods=['GET'])
def get_user_reports(user_id):
    try:
        response = supabase.table('reports').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()

        reports = []
        for report in response.data:
            photos_response = supabase.table('report_photos').select('*').eq('report_id', report['id']).execute()
            photos = [p.get('photo_url') or p.get('photo_data', '') for p in photos_response.data]

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
            photos = [p.get('photo_url') or p.get('photo_data', '') for p in photos_response.data]

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
        allowed = {'pending', 'in_progress', 'resolved'}
        if status not in allowed:
            return jsonify({'success': False, 'error': f'status must be one of {allowed}'}), 400

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

        admin_id = data.get('adminId', 'admin-001')

        supabase.table('admin_comments').insert({
            'report_id': report_id,
            'admin_id': admin_id,
            'comment_text': comment
        }).execute()

        return jsonify({'success': True}), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    try:
        # Delete photos from storage first
        photos_response = supabase.table('report_photos').select('photo_url').eq('report_id', report_id).execute()
        for photo in photos_response.data:
            url = photo.get('photo_url') or photo.get('photo_data', '')
            if url and 'report-photos' in url:
                try:
                    # Extract path from URL
                    path = url.split('/report-photos/')[1]
                    supabase.storage.from_('report-photos').remove([path])
                except Exception as e:
                    print(f"Could not delete photo from storage: {e}")

        # Delete related records
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


# ============= MIDDLEWARE =============

@app.before_request
def log_request():
    print(f"[{request.method}] {request.path}")


if __name__ == '__main__':
    app.run(debug=True, port=5000)