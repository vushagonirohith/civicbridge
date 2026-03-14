// Admin Dashboard Management
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

    // Show loading state
    dashboardSection.innerHTML = '<div class="container"><p style="text-align: center; padding: 20px;">Loading admin dashboard...</p></div>';

    // Wait for reports to load
    await adminManager.loadAllReports();
    
    // Render dashboard
    dashboardSection.innerHTML = adminManager.getAdminDashboardHTML();
    
    // Attach event listeners
    attachAdminEventListeners();
}

function attachAdminEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshAdminDashboardBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAdminDashboard);
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAdminReports);
    }

    // User filter
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('change', filterAdminReports);
    }

    // Search
    const searchInput = document.getElementById('adminSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterAdminReports);
    }

    // Status dropdowns
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', async (e) => {
            const reportId = e.target.dataset.reportId;
            const newStatus = e.target.value;
            
            try {
                const result = await apiService.updateReportStatus(reportId, newStatus);
                if (result.success) {
                    showAlert('Status updated successfully!', 'success');
                    loadAdminDashboard(); // Refresh
                } else {
                    showAlert('Failed to update status', 'error');
                }
            } catch (error) {
                console.error('Error updating status:', error);
                showAlert('Error updating status', 'error');
            }
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const reportId = e.target.closest('.delete-btn').dataset.reportId;
            
            if (confirm('Are you sure you want to delete this report?')) {
                try {
                    const result = await apiService.deleteReport(reportId);
                    if (result.success) {
                        showAlert('Report deleted successfully!', 'success');
                        loadAdminDashboard(); // Refresh
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

    // View details buttons
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

    // Filter by search
    if (searchTerm) {
        filtered = filtered.filter(r => 
            r.description.toLowerCase().includes(searchTerm) ||
            r.userName.toLowerCase().includes(searchTerm) ||
            r.address.toLowerCase().includes(searchTerm)
        );
    }

    // Filter by status
    if (statusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filter by user
    if (userFilter !== 'all') {
        filtered = filtered.filter(r => r.userName === userFilter);
    }

    // Render filtered results
    const issuesList = document.getElementById('adminIssuesList');
    if (issuesList) {
        issuesList.innerHTML = adminManager.renderAdminIssuesList(filtered);
        attachAdminEventListeners(); // Re-attach listeners
    }
}

function _esc(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function openLightbox(photos, startIndex) {
    document.getElementById('adminLightbox')?.remove();

    let current = startIndex;

    const lb = document.createElement('div');
    lb.id = 'adminLightbox';
    lb.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,0.92);z-index:20000;
        display:flex;flex-direction:column;align-items:center;justify-content:center;`;

    const render = () => {
        lb.innerHTML = `
            <div style="position:relative;width:100%;max-width:900px;padding:0 16px;text-align:center;">
                <!-- close -->
                <button onclick="document.getElementById('adminLightbox').remove()"
                    style="position:fixed;top:16px;right:20px;background:rgba(255,255,255,0.15);
                           border:none;color:white;font-size:1.6rem;width:44px;height:44px;
                           border-radius:50%;cursor:pointer;z-index:10;">✕</button>

                <!-- counter -->
                <div style="color:#ccc;font-size:0.85rem;margin-bottom:10px;">
                    ${current + 1} / ${photos.length}
                </div>

                <!-- image -->
                <img src="${_esc(photos[current])}"
                     alt="Photo ${current + 1}"
                     style="max-width:100%;max-height:75vh;border-radius:8px;object-fit:contain;display:block;margin:0 auto;"
                     onerror="this.src='';this.alt='Image failed to load';this.style.padding='40px';this.style.color='#fff';">

                <!-- nav -->
                <div style="display:flex;justify-content:center;gap:16px;margin-top:16px;">
                    ${photos.length > 1 ? `
                        <button id="lbPrev" style="background:rgba(255,255,255,0.15);border:none;color:white;
                            padding:10px 22px;border-radius:6px;font-size:1rem;cursor:pointer;">
                            ← Prev
                        </button>
                        <button id="lbNext" style="background:rgba(255,255,255,0.15);border:none;color:white;
                            padding:10px 22px;border-radius:6px;font-size:1rem;cursor:pointer;">
                            Next →
                        </button>` : ''}
                    <a href="${_esc(photos[current])}" target="_blank"
                       style="background:rgba(255,255,255,0.15);color:white;text-decoration:none;
                              padding:10px 22px;border-radius:6px;font-size:1rem;">
                        <i class="fas fa-external-link-alt"></i> Open Full
                    </a>
                </div>
            </div>`;

        lb.querySelector('#lbPrev')?.addEventListener('click', () => {
            current = (current - 1 + photos.length) % photos.length;
            render();
        });
        lb.querySelector('#lbNext')?.addEventListener('click', () => {
            current = (current + 1) % photos.length;
            render();
        });
    };

    render();
    document.body.appendChild(lb);

    // swipe support for mobile
    let touchStartX = 0;
    lb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            current = diff > 0
                ? (current + 1) % photos.length
                : (current - 1 + photos.length) % photos.length;
            render();
        }
    });

    lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });

    // keyboard nav
    const onKey = e => {
        if (e.key === 'ArrowRight') { current = (current + 1) % photos.length; render(); }
        if (e.key === 'ArrowLeft')  { current = (current - 1 + photos.length) % photos.length; render(); }
        if (e.key === 'Escape')     { lb.remove(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
}

function showReportDetailsModal(report) {
    document.getElementById('reportDetailsModal')?.remove();

    const statusLabel = (report.status || 'pending').replace('_', ' ');
    const statusClass = report.status === 'resolved'
        ? 'status-resolved'
        : report.status === 'in_progress' ? 'status-in-progress' : 'status-pending';

    // ── Photos section ──────────────────────────────────────────
    let photosHTML = '<p style="opacity:0.6;font-size:0.9rem;margin:0;">No photos attached to this report.</p>';
    if (report.photos && report.photos.length > 0) {
        const thumbs = report.photos.map((url, i) => `
            <div class="admin-photo-thumb" onclick="openLightbox(window.__currentReportPhotos__, ${i})"
                 title="Click to view full size">
                <img src="${_esc(url)}" alt="Photo ${i + 1}"
                     onerror="this.parentElement.style.display='none'">
                <div class="admin-photo-overlay"><i class="fas fa-search-plus"></i></div>
            </div>`).join('');

        photosHTML = `
            <div class="admin-photo-grid">${thumbs}</div>
            <p style="font-size:0.8rem;opacity:0.6;margin-top:8px;">
                <i class="fas fa-info-circle"></i>
                Tap any photo to view full size. ${report.photos.length} photo${report.photos.length > 1 ? 's' : ''} total.
            </p>`;
    }

    // ── Comments section ────────────────────────────────────────
    const commentsHTML = report.comments && report.comments.length > 0
        ? report.comments.map(c => `
            <div style="background:var(--light);padding:10px 14px;margin:6px 0;border-radius:6px;border-left:3px solid var(--secondary);">
                <small style="opacity:0.7;">${c.created_at ? new Date(c.created_at).toLocaleString() : ''}</small>
                <p style="margin:4px 0 0;">${_esc(c.comment_text || '')}</p>
            </div>`).join('')
        : '<p style="opacity:0.6;font-size:0.9rem;margin:0;">No admin comments yet.</p>';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'reportDetailsModal';
    modal.innerHTML = `
        <div class="modal-content large-modal" style="max-width:660px;">
            <span class="close">&times;</span>

            <div class="login-header" style="margin-bottom:18px;">
                <h2 style="font-size:1.2rem;">
                    <i class="fas fa-map-marker-alt"></i>
                    ${_esc(report.issueType?.charAt(0).toUpperCase() + report.issueType?.slice(1) || 'Issue')} Report
                </h2>
                <span class="issue-status ${statusClass}" style="display:inline-block;margin-top:6px;">${statusLabel}</span>
            </div>

            <!-- User -->
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Reported By</h4>
                <p><strong>Name:</strong> ${_esc(report.userName || 'Unknown')}</p>
                <p style="margin-top:4px;"><strong>Email:</strong> ${_esc(report.userEmail || 'Unknown')}</p>
            </div>

            <!-- Issue info -->
            <div class="detail-section">
                <h4><i class="fas fa-info-circle"></i> Issue Details</h4>
                <p><strong>Type:</strong> ${_esc(report.issueType || 'General')}</p>
                <p style="margin-top:4px;"><strong>Description:</strong> ${_esc(report.description || '')}</p>
                <p style="margin-top:4px;"><strong>Location:</strong> ${_esc(report.address || 'Not specified')}</p>
                <p style="margin-top:4px;"><strong>Date:</strong> ${report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'Unknown'}</p>
            </div>

            <!-- Photos -->
            <div class="detail-section">
                <h4><i class="fas fa-camera"></i> Photos</h4>
                ${photosHTML}
            </div>

            <!-- Comments + add new -->
            <div class="detail-section">
                <h4><i class="fas fa-comments"></i> Admin Comments</h4>
                <div id="commentsList" style="margin-bottom:14px;">${commentsHTML}</div>
                <div style="display:flex;gap:10px;">
                    <input type="text" id="newComment" class="form-control"
                           placeholder="Add a comment visible to the user..." style="flex:1;">
                    <button class="btn btn-primary" onclick="addCommentToReport('${_esc(report.id)}')">
                        <i class="fas fa-paper-plane"></i> Send
                    </button>
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;margin-top:10px;">
                <button class="btn btn-outline close-modal">Close</button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Store photos on window so lightbox can access them
    window.__currentReportPhotos__ = report.photos || [];

    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
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
            loadAdminDashboard(); // Refresh
        } else {
            showAlert('Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showAlert('Error adding comment', 'error');
    }
}