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

function closeIssueDetailsModal() {
    const modal = document.getElementById('issueDetailsModal');
    if (modal) modal.remove();
}

function showIssueDetailsModal(issue) {
    closeIssueDetailsModal();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'issueDetailsModal';

    const commentsHtml = issue.comments && issue.comments.length > 0
        ? issue.comments.map(c => `
            <div style="background: var(--light); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-weight: 600; margin-bottom: 6px;"><i class="fas fa-user-shield"></i> Admin Update</div>
                <div style="margin-bottom: 6px;">${escapeHtml(c.comment_text || '')}</div>
                <small style="opacity: 0.75;">${c.created_at ? new Date(c.created_at).toLocaleString() : ''}</small>
            </div>
        `).join('')
        : '<p style="opacity:0.75;">No admin updates yet.</p>';

    const photosHtml = issue.photos && issue.photos.length > 0
        ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
                ${issue.photos.map((photo, index) => `
                    <a href="${photo}" target="_blank" rel="noopener noreferrer">
                        <img src="${photo}" alt="Issue photo ${index + 1}" style="width:100%;height:140px;object-fit:cover;border-radius:10px;border:1px solid rgba(0,0,0,0.08);">
                    </a>
                `).join('')}
            </div>
        `
        : '<p style="opacity:0.75;">No photos uploaded for this issue.</p>';

    const mapsLink = getMapsLink(issue.locationObj);

    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close">&times;</span>
            <div class="login-header">
                <h2>Issue Details</h2>
                <p>${escapeHtml(issue.title)} • ${escapeHtml((issue.status || 'pending').replace('_', ' '))}</p>
            </div>
            <div style="padding: 20px; display:grid; gap:18px;">
                <div style="background: var(--light); border-radius: 12px; padding: 16px;">
                    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
                        <div>
                            <div style="font-size:1.05rem;font-weight:700;">${escapeHtml(issue.title)}</div>
                            <div style="margin-top:6px;opacity:0.8;">Ticket ID: <strong>${escapeHtml(issue.ticket_id || 'Not assigned')}</strong></div>
                        </div>
                        <span class="issue-status status-${escapeHtml(issue.status || 'pending')}">${escapeHtml((issue.status || 'pending').replace('_', ' '))}</span>
                    </div>
                </div>

                <div>
                    <h4 style="margin-bottom:10px;">Issue Summary</h4>
                    <p><strong>Type:</strong> ${escapeHtml(issue.type || 'General')}</p>
                    <p><strong>Description:</strong> ${escapeHtml(issue.description || '')}</p>
                    <p><strong>Submitted on:</strong> ${escapeHtml(issue.date || '')}</p>
                    <p><strong>Address:</strong> ${escapeHtml(issue.location || 'Location not specified')}</p>
                    <p><strong>Submitted live location:</strong> ${escapeHtml(formatCoordinates(issue.locationObj))}</p>
                    ${mapsLink ? `<p><a href="${mapsLink}" target="_blank" rel="noopener noreferrer"><i class="fas fa-map-marked-alt"></i> Open submitted location in Google Maps</a></p>` : ''}
                </div>

                <div>
                    <h4 style="margin-bottom:10px;">Uploaded Photos</h4>
                    ${photosHtml}
                </div>

                <div>
                    <h4 style="margin-bottom:10px;">Admin Updates</h4>
                    ${commentsHtml}
                </div>

                <div style="display:flex;justify-content:flex-end;">
                    <button class="btn btn-outline close-issue-modal">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    modal.querySelector('.close').addEventListener('click', closeIssueDetailsModal);
    modal.querySelector('.close-issue-modal').addEventListener('click', closeIssueDetailsModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeIssueDetailsModal();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadDashboard();
                }
            });
        });
        
        observer.observe(dashboardSection);
    }
});

function loadDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    // Check if user is admin first
    if (isAdmin()) {
        loadAdminDashboard();
        return;
    }

    const isLoggedIn = checkLoginStatus();
    
    if (!isLoggedIn) {
        dashboardSection.innerHTML = getLoginPromptHTML();
        document.getElementById('dashboardLoginBtn')?.addEventListener('click', () => {
            document.getElementById('loginModal').style.display = 'block';
        });
        return;
    }

    // Load user data and display dashboard
    loadUserDashboard();
}

async function loadUserDashboard() {
    const userData = getCurrentUser();
    const userId = localStorage.getItem('userId');
    
    console.log('Loading dashboard for user:', userId);
    
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    dashboardSection.innerHTML = `<div class="container"><p style="text-align: center; padding: 20px;">Loading your dashboard...</p></div>`;
    
    const userIssues = await getUserIssues();
    
    window.currentUserIssues = userIssues;
    dashboardSection.innerHTML = getUserDashboardHTML(userData, userIssues);
    initializeDashboard(userIssues);
    initTicketSearch(userIssues);
}

function getUserDashboardHTML(userData, userIssues = []) {
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail');
    
    const totalIssues = userIssues.length;
    const pendingIssues = userIssues.filter(issue => issue.status === 'pending').length;
    const inProgressIssues = userIssues.filter(issue => issue.status === 'in_progress').length;
    const resolvedIssues = userIssues.filter(issue => issue.status === 'resolved').length;
    
    const joinDate = userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Recently';
    
    return `
        <div class="container">
            <div class="dashboard-header">
                <div>
                    <h2>Welcome back, ${userName}!</h2>
                    <p>Here's an overview of your reported issues and activity</p>
                    <div style="color: var(--text-color); opacity: 0.7; font-size: 0.9rem;">
                        <div>Logged in as: ${userEmail}</div>
                        <div>Member since: ${joinDate}</div>
                        <div>Total reports: ${totalIssues}</div>
                    </div>
                </div>
                <button class="btn btn-primary" id="refreshDashboardBtn">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            <div class="dashboard-stats">
                <div class="dashboard-stat-card">
                    <div class="dashboard-stat-number">${totalIssues}</div>
                    <div class="dashboard-stat-label">Total Issues</div>
                </div>
                <div class="dashboard-stat-card">
                    <div class="dashboard-stat-number">${pendingIssues}</div>
                    <div class="dashboard-stat-label">Pending</div>
                </div>
                <div class="dashboard-stat-card">
                    <div class="dashboard-stat-number">${inProgressIssues}</div>
                    <div class="dashboard-stat-label">In Progress</div>
                </div>
                <div class="dashboard-stat-card">
                    <div class="dashboard-stat-number">${resolvedIssues}</div>
                    <div class="dashboard-stat-label">Resolved</div>
                </div>
            </div>

            <div class="issues-filters">
                <button class="filter-btn active" data-filter="all">All Issues</button>
                <button class="filter-btn" data-filter="pending">Pending</button>
                <button class="filter-btn" data-filter="in_progress">In Progress</button>
                <button class="filter-btn" data-filter="resolved">Resolved</button>
            </div>

            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px;">
                <input
                    type="text"
                    id="ticketSearchInput"
                    class="form-control"
                    placeholder="Search by Ticket ID (e.g. CB-00001)"
                    style="max-width:320px;font-family:monospace;text-transform:uppercase;"
                />
                <button class="btn btn-outline" id="ticketSearchBtn">
                    <i class="fas fa-search"></i> Search
                </button>
                <button class="btn btn-outline" id="ticketSearchClear" style="display:none;">
                    Clear
                </button>
            </div>

            <div class="issues-list" id="issuesList">
                ${renderIssuesList(userIssues)}
            </div>

            ${totalIssues > 0 ? `
                <div class="dashboard-card" style="margin-top: 2rem;">
                    <h3><i class="fas fa-chart-line"></i> Activity Summary</h3>
                    <div style="display: grid; gap: 1rem; margin-top: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>Response Rate</span>
                            <span style="font-weight: 600;">${totalIssues > 0 ? Math.round(((inProgressIssues + resolvedIssues) / totalIssues) * 100) : 0}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${totalIssues > 0 ? ((inProgressIssues + resolvedIssues) / totalIssues) * 100 : 0}%"></div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>Resolution Rate</span>
                            <span style="font-weight: 600;">${totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0}%"></div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                            <span>Resolution Rate: ${totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0}%</span>
                            <span>Active Issues: ${pendingIssues + inProgressIssues}</span>
                        </div>
                    </div>
                </div>
            ` : ''}

        </div>
    `;
}

function getLoginPromptHTML() {
    return `
        <div class="container">
            <div class="section-title">
                <h2>Your Dashboard</h2>
                <p>Login to view and manage your reported issues</p>
            </div>
            <div class="login-prompt">
                <div class="login-prompt-content">
                    <i class="fas fa-user-lock"></i>
                    <h3>Authentication Required</h3>
                    <p>Please login to access your personal dashboard</p>
                    <button class="btn btn-primary" id="dashboardLoginBtn">Login Now</button>
                </div>
            </div>
        </div>
    `;
}

function initializeDashboard(allIssues) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterIssues(filter, allIssues);
            
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.classList.add('loading');
            setTimeout(() => {
                loadDashboard();
                showAlert('Dashboard refreshed with latest data', 'success');
            }, 1000);
        });
    }

    const reportBtn = document.getElementById('reportFromDashboard');
    if (reportBtn) {
        reportBtn.addEventListener('click', function() {
            if (typeof openReportModal === 'function') {
                openReportModal();
            }
        });
    }
}

async function getUserIssues() {
    const userId = localStorage.getItem('userId');
    console.log('getUserIssues called with userId:', userId);
    
    if (!userId) {
        console.warn('No userId found');
        return [];
    }

    try {
        console.log('Fetching reports from backend API...');
        const result = await apiService.getUserReports(userId);
        
        console.log('API response:', result);
        
        if (result.success && result.reports) {
            console.log(`Received ${result.reports.length} reports from database`);
            
            return result.reports.map(report => {
                return {
                    id: report.id,
                    ticket_id: report.ticket_id || '',
                    type: report.issueType,
                    title: `${report.issueType?.charAt(0).toUpperCase() + report.issueType?.slice(1) || 'General'} Issue`,
                    description: report.description,
                    status: report.status || 'pending',
                    date: report.timestamp ? new Date(report.timestamp).toLocaleDateString() : new Date().toLocaleDateString(),
                    location: report.address || 'Location not specified',
                    comments: report.comments || [],
                    photos: report.photos || [],
                    locationObj: report.location || null
                };
            });
        } else {
            console.warn('API returned error:', result);
            showAlert('Failed to load reports from database', 'error');
            return [];
        }
    } catch (error) {
        console.error('Error fetching user reports:', error);
        showAlert('Failed to load your reports. Please check your connection.', 'error');
        return [];
    }
}

function renderIssuesList(issues) {
    if (issues.length === 0) {
        return `
            <div class="no-issues">
                <i class="fas fa-inbox"></i>
                <h3>No issues reported yet</h3>
                <p>Start by reporting an issue in your community to see your activity here!</p>
                <button class="btn btn-primary" id="reportFromDashboard">Report Your First Issue</button>
            </div>
        `;
    }

    return issues.map(issue => `
        <div class="issue-card">
            <div class="issue-header">
                <div>
                    <div class="issue-title">${issue.title}</div>
                    <span class="issue-type">${issue.type?.charAt(0).toUpperCase() + issue.type?.slice(1) || 'General'}</span>
                </div>
                <div style="text-align:right;">
                    <span class="issue-status status-${issue.status}">${issue.status.replace('_', ' ')}</span>
                    ${issue.ticket_id ? `<div style="margin-top:4px;font-family:monospace;font-size:0.75rem;font-weight:700;color:var(--secondary);background:var(--light);padding:2px 8px;border-radius:4px;display:inline-block;">${issue.ticket_id}</div>` : ''}
                </div>
            </div>
            <div class="issue-description">${issue.description}</div>
            <div class="issue-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${issue.location}</span>
                <span><i class="fas fa-calendar"></i> ${issue.date}</span>
                ${issue.photos && issue.photos.length > 0 ? 
                    `<span><i class="fas fa-camera"></i> ${issue.photos.length} photo(s)</span>` : ''}
            </div>
            ${issue.comments && issue.comments.length > 0 ? `
                <div class="admin-comment-user">
                    <strong><i class="fas fa-user-shield"></i> Admin Response:</strong>
                    <p>${issue.comments[issue.comments.length - 1].comment_text}</p>
                    <small>Last updated: ${new Date(issue.comments[issue.comments.length - 1].created_at).toLocaleString()}</small>
                </div>
            ` : ''}
            <div class="issue-actions">
                <button class="btn btn-outline btn-small" onclick="viewIssue('${issue.id}')">View Details</button>
                ${issue.photos && issue.photos.length > 0 ? 
                    `<button class="btn btn-outline btn-small" onclick="viewIssuePhotos('${issue.id}')">View Photos</button>` : ''}
            </div>
        </div>
    `).join('');
}

function filterIssues(filter, allIssues) {
    let filteredIssues = allIssues;
    
    if (filter !== 'all') {
        filteredIssues = allIssues.filter(issue => issue.status === filter);
    }
    
    const issuesList = document.getElementById('issuesList');
    if (issuesList) {
        issuesList.innerHTML = renderIssuesList(filteredIssues);
    }
}

window.viewIssue = function(issueId) {
    const issues = Array.isArray(window.currentUserIssues) ? window.currentUserIssues : [];
    const issue = issues.find(item => item.id === issueId);
    if (!issue) {
        showAlert('Issue details could not be loaded.', 'error');
        return;
    }
    showIssueDetailsModal(issue);
};

window.viewIssuePhotos = function(issueId) {
    const issues = Array.isArray(window.currentUserIssues) ? window.currentUserIssues : [];
    const issue = issues.find(item => item.id === issueId);
    if (!issue) {
        showAlert('Issue photos could not be loaded.', 'error');
        return;
    }
    showIssueDetailsModal(issue);
};

function initTicketSearch(allIssues) {
    const input = document.getElementById('ticketSearchInput');
    const btn   = document.getElementById('ticketSearchBtn');
    const clear = document.getElementById('ticketSearchClear');
    if (!input || !btn) return;

    async function doSearch() {
        const val = input.value.trim();
        if (!val) return;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        const result = await apiService.searchByTicket(val);

        btn.innerHTML = '<i class="fas fa-search"></i> Search';
        btn.disabled = false;

        const listEl = document.getElementById('issuesList');
        if (!result.success) {
            listEl.innerHTML = `
                <div class="no-issues">
                    <i class="fas fa-search" style="color:var(--secondary)"></i>
                    <h3>No report found</h3>
                    <p>No report with ticket ID <strong>${val.toUpperCase()}</strong> found.</p>
                </div>`;
            clear.style.display = 'inline-block';
            return;
        }

        const r = result.report;
        const mapped = [{
            id: r.id,
            ticket_id: r.ticket_id,
            type: r.issueType,
            title: `${(r.issueType||'Issue').charAt(0).toUpperCase() + (r.issueType||'').slice(1)} Issue`,
            description: r.description,
            status: r.status || 'pending',
            date: r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '',
            location: r.address || 'Location not specified',
            comments: r.comments || [],
            photos: r.photos || [],
            locationObj: r.location || null
        }];

        listEl.innerHTML = renderIssuesList(mapped);
        clear.style.display = 'inline-block';
    }

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

    clear.addEventListener('click', () => {
        input.value = '';
        clear.style.display = 'none';
        const listEl = document.getElementById('issuesList');
        if (listEl) listEl.innerHTML = renderIssuesList(allIssues);
    });
}