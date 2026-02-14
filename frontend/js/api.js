// API Service - Handles all backend communication
const API_BASE = 'http://localhost:5000/api';

const apiService = {
    // ============= AUTH =============
    
    async signup(email, name, password) {
        try {
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password })
            });
            return await response.json();
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    },

    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            return await response.json();
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    async adminLogin(username, password) {
        try {
            const response = await fetch(`${API_BASE}/auth/admin-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await response.json();
        } catch (error) {
            console.error('Admin login error:', error);
            return { success: false, error: error.message };
        }
    },

    // ============= REPORTS =============

    async createReport(reportData) {
        try {
            const response = await fetch(`${API_BASE}/reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });
            return await response.json();
        } catch (error) {
            console.error('Create report error:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserReports(userId) {
        try {
            const response = await fetch(`${API_BASE}/reports/user/${userId}`);
            return await response.json();
        } catch (error) {
            console.error('Get user reports error:', error);
            return { success: false, error: error.message };
        }
    },

    async getAllReports() {
        try {
            const response = await fetch(`${API_BASE}/reports`);
            return await response.json();
        } catch (error) {
            console.error('Get all reports error:', error);
            return { success: false, error: error.message };
        }
    },

    async updateReportStatus(reportId, status) {
        try {
            const response = await fetch(`${API_BASE}/reports/${reportId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            return await response.json();
        } catch (error) {
            console.error('Update status error:', error);
            return { success: false, error: error.message };
        }
    },

    async addComment(reportId, comment, adminId = 'admin-001') {
        try {
            const response = await fetch(`${API_BASE}/reports/${reportId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment, adminId })
            });
            return await response.json();
        } catch (error) {
            console.error('Add comment error:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteReport(reportId) {
        try {
            const response = await fetch(`${API_BASE}/reports/${reportId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Delete report error:', error);
            return { success: false, error: error.message };
        }
    }
};