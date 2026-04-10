function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseAdminComment(commentObj) {
    const raw = commentObj?.comment_text || '';
    const prefix = '__RESOLUTION_PROOF__';

    if (typeof raw === 'string' && raw.startsWith(prefix)) {
        try {
            const parsed = JSON.parse(raw.slice(prefix.length));
            return {
                type: 'resolution_proof',
                message: parsed.message || 'Issue resolved by admin.',
                photos: Array.isArray(parsed.photos) ? parsed.photos : [],
                created_at: commentObj.created_at
            };
        } catch (e) {
            console.warn('Failed to parse resolution proof comment:', e);
        }
    }

    return {
        type: 'text',
        message: raw,
        photos: [],
        created_at: commentObj?.created_at
    };
}

function hasResolutionProof(comments = []) {
    return Array.isArray(comments) && comments.some(commentObj => {
        const parsed = parseAdminComment(commentObj);
        return parsed.type === 'resolution_proof';
    });
}

function getEffectiveStatus(issue) {
    if (hasResolutionProof(issue?.comments || [])) return 'resolved';
    return issue?.status || 'pending';
}

function getProgressInfo(issue) {
    const status = getEffectiveStatus(issue);

    if (status === 'resolved') {
        return { label: 'Completed', value: 100 };
    }
    if (status === 'in_progress') {
        return { label: 'In Progress', value: 60 };
    }
    return { label: 'Pending', value: 20 };
}

function getLatestCommentPreview(comments, issueId) {
    if (!comments || !comments.length) return '';
    const latest = parseAdminComment(comments[comments.length - 1]);

    if (latest.type === 'resolution_proof') {
        const thumbsHtml = latest.photos.length ? `
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;">
                ${latest.photos.map(url => `
                    <a href="${url}" target="_blank" rel="noopener noreferrer"
                       style="display:block;width:80px;height:80px;border-radius:8px;overflow:hidden;border:2px solid #22c55e;flex-shrink:0;">
                        <img src="${url}" alt="Proof photo"
                             style="width:100%;height:100%;object-fit:cover;"
                             onerror="this.parentElement.style.display='none'">
                    </a>
                `).join('')}
            </div>
            <button class="btn btn-small"
                onclick="viewIssue('${issueId}')"
                style="background:#16a34a;color:white;border:none;padding:6px 14px;border-radius:6px;font-size:0.8rem;cursor:pointer;margin-top:4px;">
                <i class="fas fa-images"></i> View All Proof Photos (${latest.photos.length})
            </button>` : '';

        return `
            <div class="admin-comment-user" style="border-left:3px solid #22c55e;background:#f0fdf4;">
                <strong style="color:#15803d;"><i class="fas fa-check-circle"></i> Resolution Update:</strong>
                <p style="margin:6px 0;">${escapeHtml(latest.message)}</p>
                ${thumbsHtml}
                <small style="display:block;margin-top:6px;opacity:0.7;">
                    Last updated: ${latest.created_at ? new Date(latest.created_at).toLocaleString() : ''}
                </small>
            </div>
        `;
    }

    return `
        <div class="admin-comment-user">
            <strong><i class="fas fa-user-shield"></i> Admin Response:</strong>
            <p>${escapeHtml(latest.message)}</p>
            <small>Last updated: ${latest.created_at ? new Date(latest.created_at).toLocaleString() : ''}</small>
        </div>
    `;
}

function renderCommentDetails(commentObj) {
    const comment = parseAdminComment(commentObj);

    if (comment.type === 'resolution_proof') {
        return `
            <div style="background:#ecfdf3;border:1px solid #b7ebc6;padding:12px;border-radius:10px;margin-bottom:10px;">
                <div style="font-weight:700;color:#15803d;margin-bottom:6px;">
                    <i class="fas fa-check-circle"></i> Issue Resolved
                </div>
                <div style="margin-bottom:8px;">${escapeHtml(comment.message)}</div>
                ${comment.photos.length ? `
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">
                        ${comment.photos.map(photo => `
                            <a href="${photo}" target="_blank" rel="noopener noreferrer">
                                <img src="${photo}" alt="Resolution proof" style="width:100%;height:120px;object-fit:cover;border-radius:8px;border:1px solid rgba(0,0,0,0.08);">
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
                <small style="display:block;margin-top:8px;opacity:.75;">${comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</small>
            </div>
        `;
    }

    return `
        <div style="background: var(--light); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <div style="font-weight: 600; margin-bottom: 6px;"><i class="fas fa-user-shield"></i> Admin Update</div>
            <div style="margin-bottom: 6px;">${escapeHtml(comment.message)}</div>
            <small style="opacity: 0.75;">${comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</small>
        </div>
    `;
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

    const effectiveStatus = getEffectiveStatus(issue);

    const commentsHtml = issue.comments && issue.comments.length > 0
        ? issue.comments.map(c => renderCommentDetails(c)).join('')
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

    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close">&times;</span>
            <div class="login-header">
                <h2>Issue Details</h2>
                <p>${escapeHtml(issue.title)} • ${escapeHtml(effectiveStatus.replace('_', ' '))}</p>
            </div>
            <div style="padding: 20px; display:grid; gap:18px;">
                <div style="background: var(--light); border-radius: 12px; padding: 16px;">
                    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;">
                        <div>
                            <div style="font-size:1.05rem;font-weight:700;">${escapeHtml(issue.title)}</div>
                            <div style="margin-top:6px;opacity:0.8;">Ticket ID: <strong>${escapeHtml(issue.ticket_id || 'Not assigned')}</strong></div>
                        </div>
                        <span class="issue-status status-${escapeHtml(effectiveStatus)}">${escapeHtml(effectiveStatus.replace('_', ' '))}</span>
                    </div>
                </div>

                <div>
                    <h4 style="margin-bottom:10px;">Issue Summary</h4>
                    <p><strong>Type:</strong> ${escapeHtml(issue.type || 'General')}</p>
                    <p><strong>Description:</strong> ${escapeHtml(issue.description || '')}</p>
                    <p><strong>Submitted on:</strong> ${escapeHtml(issue.date || '')}</p>
                    <p><strong>Address:</strong> ${escapeHtml(issue.location || 'Location not specified')}</p>
                </div>

                <div>
                    <h4 style="margin-bottom:10px;">Uploaded Photos</h4>
                    ${photosHtml}
                </div>

                <div>
                    <h4 style="margin-bottom:10px;">Admin Updates / Resolution Proof</h4>
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
        let dashboardLoaded = false;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !dashboardLoaded) {
                    dashboardLoaded = true;
                    observer.disconnect();
                    loadDashboard();
                }
            });
        }, { threshold: 0.1 });
        observer.observe(dashboardSection);
    }
});

function loadDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

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

    loadUserDashboard();
}

async function loadUserDashboard() {
    const userData = getCurrentUser();
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
    const pendingIssues = userIssues.filter(issue => getEffectiveStatus(issue) === 'pending').length;
    const inProgressIssues = userIssues.filter(issue => getEffectiveStatus(issue) === 'in_progress').length;
    const resolvedIssues = userIssues.filter(issue => getEffectiveStatus(issue) === 'resolved').length;

    const joinDate = userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Recently';

    return `
        <div class="container">
            <div class="dashboard-header">
                <div>
                    <h2>Welcome back, ${escapeHtml(userName)}!</h2>
                    <p>Here's an overview of your reported issues and activity</p>
                    <div style="color: var(--text-color); opacity: 0.7; font-size: 0.9rem;">
                        <div>Logged in as: ${escapeHtml(userEmail || '')}</div>
                        <div>Member since: ${escapeHtml(joinDate)}</div>
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

            <div class="ticket-search-bar" style="display:flex;gap:10px;margin-bottom:16px;align-items:center;">
                <input type="text" id="ticketSearchInput" class="form-control"
                    placeholder="Search by Ticket ID (e.g. CB-00001)"
                    style="flex:1;font-family:monospace;text-transform:uppercase;">
                <button class="btn btn-primary" id="ticketSearchBtn" style="white-space:nowrap;">
                    <i class="fas fa-search"></i> Search
                </button>
                <button class="btn btn-outline" id="ticketSearchClear" style="display:none;white-space:nowrap;">
                    Clear
                </button>
            </div>

            <div class="issues-list" id="issuesList">
                ${renderIssuesList(userIssues)}
            </div>

            ${userIssues.length > 0 ? `
                <div style="margin-top: 2rem; padding: 1rem; background: var(--light); border-radius: 8px;">
                    <h4><i class="fas fa-chart-bar"></i> Your Reporting Activity</h4>
                    <p>You have submitted ${totalIssues} issue reports with ${resolvedIssues} resolved so far.</p>
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

    if (!userId) return [];

    try {
        const result = await apiService.getUserReports(userId);

        if (result.success && result.reports) {
            return result.reports.map(report => {
                const mapped = {
                    id: report.id,
                    ticket_id: report.ticket_id || '',
                    type: report.issueType,
                    title: `${report.issueType?.charAt(0).toUpperCase() + report.issueType?.slice(1) || 'General'} Issue`,
                    description: report.description,
                    status: report.status || 'pending',
                    date: report.timestamp ? new Date(report.timestamp).toLocaleDateString() : new Date().toLocaleDateString(),
                    location: report.address || 'Location not specified',
                    comments: report.comments || [],
                    photos: report.photos || []
                };

                mapped.status = getEffectiveStatus(mapped);
                mapped.progress = getProgressInfo(mapped);

                return mapped;
            });
        }

        showAlert('Failed to load reports from database', 'error');
        return [];
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
                    <div class="issue-title">${escapeHtml(issue.title)}</div>
                    <span class="issue-type">${escapeHtml(issue.type?.charAt(0).toUpperCase() + issue.type?.slice(1) || 'General')}</span>
                </div>
                <div style="text-align:right;">
                    <span class="issue-status status-${escapeHtml(issue.status || 'pending')}">${escapeHtml((issue.status || 'pending').replace('_', ' '))}</span>
                    ${issue.ticket_id ? `<div style="margin-top:4px;font-family:monospace;font-size:0.75rem;font-weight:700;color:var(--secondary);background:var(--light);padding:2px 8px;border-radius:4px;display:inline-block;">${escapeHtml(issue.ticket_id)}</div>` : ''}
                </div>
            </div>
            <div class="issue-description">${escapeHtml(issue.description || '')}</div>
            <div class="issue-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(issue.location || 'Location not specified')}</span>
                <span><i class="fas fa-calendar"></i> ${escapeHtml(issue.date || '')}</span>
                ${issue.photos && issue.photos.length > 0 ? `<span><i class="fas fa-camera"></i> ${issue.photos.length} photo(s)</span>` : ''}
            </div>
            ${getLatestCommentPreview(issue.comments, issue.id)}
            <div style="margin-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <small style="font-weight:600;">Progress</small>
                    <small style="font-weight:700;">${escapeHtml(issue.progress?.label || 'Pending')} - ${issue.progress?.value || 20}%</small>
                </div>
                <div style="width:100%;height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
                    <div style="width:${issue.progress?.value || 20}%;height:100%;background:${issue.status === 'resolved' ? '#22c55e' : issue.status === 'in_progress' ? '#f59e0b' : '#3b82f6'};border-radius:999px;"></div>
                </div>
            </div>
            <div class="issue-actions">
                <button class="btn btn-outline btn-small" onclick="viewIssue('${issue.id}')">View Details</button>
                ${issue.photos && issue.photos.length > 0 ? `<button class="btn btn-outline btn-small" onclick="viewIssuePhotos('${issue.id}')">View Photos</button>` : ''}
            </div>
        </div>
    `).join('');
}

function filterIssues(filter, allIssues) {
    let filteredIssues = allIssues;

    if (filter !== 'all') {
        filteredIssues = allIssues.filter(issue => getEffectiveStatus(issue) === filter);
    }

    const issuesList = document.getElementById('issuesList');
    if (issuesList) issuesList.innerHTML = renderIssuesList(filteredIssues);
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
                    <p>No report with ticket ID <strong>${escapeHtml(val.toUpperCase())}</strong> found.</p>
                </div>`;
            clear.style.display = 'inline-block';
            return;
        }

        const r = result.report;
        const mappedItem = {
            id: r.id,
            ticket_id: r.ticket_id,
            type: r.issueType,
            title: `${(r.issueType || 'Issue').charAt(0).toUpperCase() + (r.issueType || '').slice(1)} Issue`,
            description: r.description,
            status: r.status || 'pending',
            date: r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '',
            location: r.address || 'Location not specified',
            comments: r.comments || [],
            photos: r.photos || []
        };

        mappedItem.status = getEffectiveStatus(mappedItem);
        mappedItem.progress = getProgressInfo(mappedItem);

        const mapped = [mappedItem];

        window.currentUserIssues = mapped;
        listEl.innerHTML = renderIssuesList(mapped);
        clear.style.display = 'inline-block';
    }

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

    clear.addEventListener('click', () => {
        input.value = '';
        clear.style.display = 'none';
        window.currentUserIssues = allIssues;
        const listEl = document.getElementById('issuesList');
        if (listEl) listEl.innerHTML = renderIssuesList(allIssues);
    });
}