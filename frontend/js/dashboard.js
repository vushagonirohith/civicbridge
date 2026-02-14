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
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName') || 'User';
    const userId = localStorage.getItem('userId');
    
    console.log('Loading dashboard for user:', userId);
    
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    dashboardSection.innerHTML = `<div class="container"><p style="text-align: center; padding: 20px;">Loading your dashboard...</p></div>`;
    
    // Wait for async getUserIssues - fetches from backend
    const userIssues = await getUserIssues();
    
    dashboardSection.innerHTML = getUserDashboardHTML(userData, userIssues);
    initializeDashboard(userIssues);
}

function getUserDashboardHTML(userData, userIssues = []) {
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail');
    
    // Calculate user stats from backend data
    const totalIssues = userIssues.length;
    const pendingIssues = userIssues.filter(issue => issue.status === 'pending').length;
    const inProgressIssues = userIssues.filter(issue => issue.status === 'in_progress').length;
    const resolvedIssues = userIssues.filter(issue => issue.status === 'resolved').length;
    
    // Get user join date from localStorage (set during login)
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

            <div class="issues-list" id="issuesList">
                ${renderIssuesList(userIssues)}
            </div>
            
            ${userIssues.length > 0 ? `
                <div style="margin-top: 2rem; padding: 1rem; background: var(--light); border-radius: 8px;">
                    <h4><i class="fas fa-chart-bar"></i> Your Reporting Activity</h4>
                    <p>You have submitted ${totalIssues} issue reports with ${resolvedIssues} resolved so far.</p>
                    <div style="background: var(--card-bg); padding: 1rem; border-radius: 4px; margin-top: 0.5rem;">
                        <strong>Quick Stats:</strong>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 0.5rem;">
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
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterIssues(filter, allIssues);
            
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Refresh button
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

    // Report from dashboard button
    const reportBtn = document.getElementById('reportFromDashboard');
    if (reportBtn) {
        reportBtn.addEventListener('click', function() {
            if (typeof openReportModal === 'function') {
                openReportModal();
            }
        });
    }
}

// FETCH FROM BACKEND API ONLY - NO localStorage
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
                    type: report.issueType,
                    title: `${report.issueType?.charAt(0).toUpperCase() + report.issueType?.slice(1) || 'General'} Issue`,
                    description: report.description,
                    status: report.status || 'pending', // Will be 'pending', 'in_progress', or 'resolved'
                    date: report.timestamp ? new Date(report.timestamp).toLocaleDateString() : new Date().toLocaleDateString(),
                    location: report.address || 'Location not specified',
                    comments: report.comments || [],
                    photos: report.photos || []
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
                <span class="issue-status status-${issue.status}">${issue.status.replace('_', ' ')}</span>
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

// Global functions for issue actions
window.viewIssue = function(issueId) {
    alert('Issue ID: ' + issueId + '\n\nThis feature will show full issue details in a modal.');
};

window.viewIssuePhotos = function(issueId) {
    alert('Issue ID: ' + issueId + '\n\nThis will show all photos for this issue.');
};