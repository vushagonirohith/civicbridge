from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import hashlib
import json
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Allow CORS for all origins during development
CORS(app, 
     origins=["*"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# Alternatively, uncomment below for production with specific origins
# CORS(app, resources={
#     r"/api/*": {
#         "origins": ["https://civicbridge-1.onrender.com", "http://localhost:8000"],
#         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#         "allow_headers": ["Content-Type"]
#     }
# })

# Supabase connection
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============= AUTH ROUTES =============

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """User signup"""
    try:
        data = request.json
        email = data.get('email')
        name = data.get('name')
        password = data.get('password')
        
        if not email or not name or not password:
            return jsonify({'success': False, 'error': 'Missing fields'}), 400
        
        # Hash password (simple)
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Insert user into Supabase
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
                'name': name
            }
        }), 201
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Missing fields'}), 400
        
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Find user in Supabase
        response = supabase.table('users').select('*').eq('email', email).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user = response.data[0]
        
        if user['password_hash'] != password_hash:
            return jsonify({'success': False, 'error': 'Wrong password'}), 401
        
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
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/admin-login', methods=['POST'])
def admin_login():
    """Admin login with hardcoded credentials"""
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        # Hardcoded admin credentials
        if username == 'admin' and password == 'admin123':
            return jsonify({
                'success': True,
                'user': {
                    'id': 'admin-001',
                    'email': 'admin@civicbridge.com',
                    'name': 'Administrator',
                    'role': 'admin'
                }
            }), 200
        
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============= REPORT ROUTES =============

@app.route('/api/reports', methods=['POST'])
def create_report():
    """Create a new report"""
    try:
        data = request.json
        user_id = data.get('userId')
        
        # Insert report
        report_data = {
            'user_id': user_id,
            'issue_type': data.get('issueType'),
            'description': data.get('description'),
            'latitude': data.get('location', {}).get('lat'),
            'longitude': data.get('location', {}).get('lng'),
            'address': data.get('address'),
            'status': 'pending'
        }
        
        response = supabase.table('reports').insert(report_data).execute()
        report_id = response.data[0]['id']
        
        # Insert photos if any
        photos = data.get('photos', [])
        if photos:
            for photo in photos:
                supabase.table('report_photos').insert({
                    'report_id': report_id,
                    'photo_data': photo
                }).execute()
        
        return jsonify({
            'success': True,
            'reportId': report_id
        }), 201
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/user/<user_id>', methods=['GET'])
def get_user_reports(user_id):
    """Get all reports by a user"""
    try:
        response = supabase.table('reports').select('*').eq('user_id', user_id).execute()
        
        reports = []
        for report in response.data:
            # Get photos for this report
            photos_response = supabase.table('report_photos').select('*').eq('report_id', report['id']).execute()
            photos = [p['photo_data'] for p in photos_response.data]
            
            # Get comments for this report
            comments_response = supabase.table('admin_comments').select('*').eq('report_id', report['id']).execute()
            
            reports.append({
                'id': report['id'],
                'issueType': report['issue_type'],
                'description': report['description'],
                'location': {
                    'lat': report['latitude'],
                    'lng': report['longitude']
                },
                'address': report['address'],
                'photos': photos,
                'status': report['status'],
                'comments': comments_response.data,
                'timestamp': report['created_at']
            })
        
        return jsonify({'success': True, 'reports': reports}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def get_all_reports():
    """Get all reports (admin only)"""
    try:
        response = supabase.table('reports').select('*').execute()
        
        reports = []
        for report in response.data:
            # Get user info
            user_response = supabase.table('users').select('*').eq('id', report['user_id']).execute()
            user = user_response.data[0] if user_response.data else {}
            
            # Get photos
            photos_response = supabase.table('report_photos').select('*').eq('report_id', report['id']).execute()
            photos = [p['photo_data'] for p in photos_response.data]
            
            # Get comments
            comments_response = supabase.table('admin_comments').select('*').eq('report_id', report['id']).execute()
            
            reports.append({
                'id': report['id'],
                'userId': report['user_id'],
                'userName': user.get('name', 'Unknown'),
                'userEmail': user.get('email', 'Unknown'),
                'issueType': report['issue_type'],
                'description': report['description'],
                'location': {
                    'lat': report['latitude'],
                    'lng': report['longitude']
                },
                'address': report['address'],
                'photos': photos,
                'status': report['status'],
                'comments': comments_response.data,
                'timestamp': report['created_at']
            })
        
        return jsonify({'success': True, 'reports': reports}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/<report_id>/status', methods=['PUT'])
def update_report_status(report_id):
    """Update report status (admin only)"""
    try:
        data = request.json
        status = data.get('status')
        
        supabase.table('reports').update({'status': status}).eq('id', report_id).execute()
        
        return jsonify({'success': True}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reports/<report_id>/comment', methods=['POST'])
def add_comment(report_id):
    """Add admin comment to report"""
    try:
        data = request.json
        comment = data.get('comment')
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
    """Delete a report (admin only)"""
    try:
        supabase.table('reports').delete().eq('id', report_id).execute()
        return jsonify({'success': True}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============= MIDDLEWARE =============

@app.before_request
def log_request():
    """Log all requests for debugging"""
    print(f"[{request.method}] {request.path} from {request.remote_addr}")
    if request.method in ['POST', 'PUT']:
        print(f"  Body: {request.get_json()}")

# ============= HEALTH CHECK =============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if backend is running"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)