// Admin Dashboard Management

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCoordinates(locationObj) {
    if (!locationObj || locationObj.lat == null || locationObj.lng == null) return 'Live location not available';
    const lat = Number(locationObj.lat);
    const lng = Number(locationObj.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return 'Live location not available';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function getMapsLink(locationObj) {
    if (!locationObj || locationObj.lat == null || locationObj.lng == null) return '';
    return `https://www.google.com/maps?q=${locationObj.lat},${locationObj.lng}`;
}

class AdminManager {
    constructor() {
        this.allReports = [];
        this.init();
    }

    init() {
        this.loadAllReports();
    }

    async loadAllReports() {
        try {
            const result = await apiService.getAllReports();
            if (result.success && result.reports) {
                this.allReports = result.reports;
            } else {
                this.allReports = [];
            }
            return this.allReports;
        } catch (error) {
            console.error('Error loading reports:', error);
            this.allReports = [];
            return [];
        }
    }

    getAdminDashboardHTML() {
        const reports = this.allReports;
        const stats = this.calculateStats(reports);
        
        return `
            <div class="container">
                <div class="dashboard-header">
                    <div>
                        <h2><i class="fas fa-user-shield"></i> Admin Dashboard</h2>
                        <p>Manage all reported issues in the system</p>
                        <small style="color: var(--text-color); opacity: 0.7;">
                            Logged in as: ${localStorage.getItem('adminUser') || 'Administrator'} (Administrator)
                        </small>
                    </div>
                    <button class="btn btn-primary" id="refreshAdminDashboardBtn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>

                <div class="dashboard-stats">
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${stats.total}</div>
                        <div class="dashboard-stat-label">Total Reports</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${stats.pending}</div>
                        <div class="dashboard-stat-label">Pending</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${stats.inProgress}</div>
                        <div class="dashboard-stat-label">In Progress</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${stats.resolved}</div>
                        <div class="dashboard-stat-label">Resolved</div>
                    </div>
                </div>

                <div class="admin-controls">
                    <div class="search-filter">
                        <input type="text" id="adminSearch" class="form-control" placeholder="Search reports...">
                        <select id="statusFilter" class="form-control">
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                        <select id="userFilter" class="form-control">
                            <option value="all">All Users</option>
                            ${this.getUserFilterOptions()}
                        </select>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
                        <input type="text" id="adminTicketSearch" class="form-control"
                            placeholder="Jump to Ticket ID (e.g. CB-00001)"
                            style="flex:1;font-family:monospace;text-transform:uppercase;max-width:280px;">
                        <button class="btn btn-primary" id="adminTicketSearchBtn" style="white-space:nowrap;">
                            <i class="fas fa-search"></i> Find Ticket
                        </button>
                        <button class="btn btn-outline" id="adminTicketClear" style="display:none;white-space:nowrap;">
                            Clear
                        </button>
                    </div>
                </div>

                <div class="admin-issues-list" id="adminIssuesList">
                    ${this.renderAdminIssuesList(reports)}
                </div>
            </div>
        `;
    }

    getUserFilterOptions() {
        const reports = this.allReports;
        const users = [...new Set(reports.map(report => report.userName || 'Unknown User'))];
        return users.map(user => `<option value="${user}">${user}</option>`).join('');
    }

    calculateStats(reports) {
        return {
            total: reports.length,
            pending: reports.filter(r => r.status === 'pending').length,
            inProgress: reports.filter(r => r.status === 'in_progress').length,
            resolved: reports.filter(r => r.status === 'resolved').length
        };
    }

    renderAdminIssuesList(reports) {
        if (reports.length === 0) {
            return `
                <div class="no-issues">
                    <i class="fas fa-inbox"></i>
                    <h3>No reports yet</h3>
                    <p>All reports will appear here once users start reporting issues.</p>
                </div>
            `;
        }

        return reports.map(report => `
            <div class="admin-issue-card">
                <div class="issue-header">
                    <div>
                        <div class="issue-title">${report.issueType?.charAt(0).toUpperCase() + report.issueType?.slice(1) || 'General'} Issue</div>
                        <span class="issue-type">${report.issueType}</span>
                        ${report.ticket_id ? `<span style="margin-left:8px;font-family:monospace;font-size:0.78rem;font-weight:700;color:var(--secondary);background:var(--light);padding:2px 8px;border-radius:4px;"><i class="fas fa-ticket-alt"></i> ${report.ticket_id}</span>` : ''}
                    </div>
                    <span class="issue-status status-${report.status}">${report.status.replace('_', ' ')}</span>
                </div>
                <div class="issue-description">${report.description}</div>
                <div class="issue-meta">
                    <span><i class="fas fa-user"></i> ${report.userName}</span>
                    <span><i class="fas fa-envelope"></i> ${report.userEmail}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${report.address}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(report.timestamp).toLocaleDateString()}</span>
                </div>

                <div class="admin-actions">
                    <select class="status-dropdown" data-report-id="${report.id}">
                        <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in_progress" ${report.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                    <button class="btn btn-secondary btn-small view-btn" data-report-id="${report.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-danger btn-small delete-btn" data-report-id="${report.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
}

let adminManager = new AdminManager();

async function loadAdminDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    const isAdmin = localStorage.getItem('userRole') === 'admin';
    if (!isAdmin) {
        dashboardSection.innerHTML = '<div class="container"><p>Access denied. Admin only.</p></div>';
        return;
    }

    dashboardSection.innerHTML = '<div class="container"><p style="text-align: center; padding: 20px;">Loading admin dashboard...</p></div>';

    await adminManager.loadAllReports();
    
    dashboardSection.innerHTML = adminManager.getAdminDashboardHTML();
    
    attachAdminEventListeners();
}

function attachAdminEventListeners() {
    const refreshBtn = document.getElementById('refreshAdminDashboardBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', loadAdminDashboard);

    const ticketInput = document.getElementById('adminTicketSearch');
    const ticketBtn   = document.getElementById('adminTicketSearchBtn');
    const ticketClear = document.getElementById('adminTicketClear');

    async function doTicketSearch() {
        const val = (ticketInput?.value || '').trim();
        if (!val) return;
        ticketBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        ticketBtn.disabled = true;

        const result = await apiService.searchByTicket(val);

        ticketBtn.innerHTML = '<i class="fas fa-search"></i> Find Ticket';
        ticketBtn.disabled = false;

        const listEl = document.getElementById('adminIssuesList');
        if (!result.success) {
            listEl.innerHTML = `<div class="no-issues">
                <i class="fas fa-search" style="color:var(--secondary)"></i>
                <h3>Not found</h3>
                <p>No report with ticket ID <strong>${val.toUpperCase()}</strong></p>
            </div>`;
            if (ticketClear) ticketClear.style.display = 'inline-block';
            return;
        }

        const r = result.report;
        adminManager.allReports = [r];
        if (listEl) listEl.innerHTML = adminManager.renderAdminIssuesList([r]);
        attachAdminEventListeners();
        if (ticketClear) ticketClear.style.display = 'inline-block';
    }

    ticketBtn?.addEventListener('click', doTicketSearch);
    ticketInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doTicketSearch(); });
    ticketClear?.addEventListener('click', () => {
        if (ticketInput) ticketInput.value = '';
        if (ticketClear) ticketClear.style.display = 'none';
        loadAdminDashboard();
    });

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAdminReports);
    }

    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('change', filterAdminReports);
    }

    const searchInput = document.getElementById('adminSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterAdminReports);
    }

    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', async (e) => {
            const reportId = e.target.dataset.reportId;
            const newStatus = e.target.value;
            
            try {
                const result = await apiService.updateReportStatus(reportId, newStatus);
                if (result.success) {
                    showAlert('Status updated successfully!', 'success');
                    loadAdminDashboard();
                } else {
                    showAlert('Failed to update status', 'error');
                }
            } catch (error) {
                console.error('Error updating status:', error);
                showAlert('Error updating status', 'error');
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const reportId = e.target.closest('.delete-btn').dataset.reportId;
            
            if (confirm('Are you sure you want to delete this report?')) {
                try {
                    const result = await apiService.deleteReport(reportId);
                    if (result.success) {
                        showAlert('Report deleted successfully!', 'success');
                        loadAdminDashboard();
                    } else {
                        showAlert('Failed to delete report', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting report:', error);
                    showAlert('Error deleting report', 'error');
                }
            }
        });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const reportId = e.target.closest('.view-btn').dataset.reportId;
            const report = adminManager.allReports.find(r => r.id === reportId);
            
            if (report) {
                showReportDetailsModal(report);
            }
        });
    });
}

function filterAdminReports() {
    const searchTerm = document.getElementById('adminSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const userFilter = document.getElementById('userFilter')?.value || 'all';

    let filtered = adminManager.allReports;

    if (searchTerm) {
        filtered = filtered.filter(r => 
            r.description.toLowerCase().includes(searchTerm) ||
            r.userName.toLowerCase().includes(searchTerm) ||
            r.address.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (userFilter !== 'all') {
        filtered = filtered.filter(r => r.userName === userFilter);
    }

    const issuesList = document.getElementById('adminIssuesList');
    if (issuesList) {
        issuesList.innerHTML = adminManager.renderAdminIssuesList(filtered);
        attachAdminEventListeners();
    }
}

function showReportDetailsModal(report) {
    const oldModal = document.getElementById('reportDetailsModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'reportDetailsModal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close">&times;</span>
            <div class="login-header">
                <h2>Report Details</h2>
                <p>${escapeHtml(report.issueType || 'General')} - ${escapeHtml(report.status || 'pending')}</p>
            </div>
            
            <div style="padding: 20px;">
                <h4>User Information</h4>
                <p><strong>Name:</strong> ${escapeHtml(report.userName || '')}</p>
                <p><strong>Email:</strong> ${escapeHtml(report.userEmail || '')}</p>
                
                <h4>Issue Details</h4>
                <p><strong>Type:</strong> ${escapeHtml(report.issueType || 'General')}</p>
                <p><strong>Description:</strong> ${escapeHtml(report.description || '')}</p>
                <p><strong>Location:</strong> ${escapeHtml(report.address || 'Location not specified')}</p>
                <p><strong>Submitted live location:</strong> ${escapeHtml(formatCoordinates(report.location))}</p>
                ${getMapsLink(report.location) ? `<p><a href="${getMapsLink(report.location)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-map-marked-alt"></i> Open submitted location in Google Maps</a></p>` : ''}
                <p><strong>Date:</strong> ${report.timestamp ? new Date(report.timestamp).toLocaleDateString() : ''}</p>
                
                ${report.photos && report.photos.length > 0 ? `
                    <h4>Photos</h4>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${report.photos.map(photo => `
                            <img src="${photo}" alt="Report photo" style="max-width: 150px; border-radius: 5px;">
                        `).join('')}
                    </div>
                ` : ''}
                
                <h4>Admin Comments</h4>
                <div id="commentsList" style="margin-bottom: 20px;">
                    ${report.comments && report.comments.length > 0 ? report.comments.map(c => `
                        <div style="background: #f0f0f0; padding: 10px; margin: 5px 0; border-radius: 5px;">
                            <p style="margin: 0;"><strong>${new Date(c.created_at).toLocaleString()}:</strong></p>
                            <p style="margin: 5px 0;">${escapeHtml(c.comment_text || '')}</p>
                        </div>
                    `).join('') : '<p>No comments yet</p>'}
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="newComment" class="form-control" placeholder="Add a comment..." style="flex: 1;">
                    <button class="btn btn-primary" onclick="addCommentToReport('${report.id}')">
                        <i class="fas fa-comment"></i> Add Comment
                    </button>
                </div>
                
                <div style="margin-top: 20px;">
                    <button class="btn btn-outline close-modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    modal.querySelector('.close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function addCommentToReport(reportId) {
    const commentInput = document.getElementById('newComment');
    const comment = commentInput?.value.trim();
    
    if (!comment) {
        showAlert('Please enter a comment', 'error');
        return;
    }
    
    try {
        const result = await apiService.addComment(reportId, comment);
        if (result.success) {
            showAlert('Comment added successfully!', 'success');
            commentInput.value = '';
            loadAdminDashboard();
        } else {
            showAlert('Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showAlert('Error adding comment', 'error');
    }
}