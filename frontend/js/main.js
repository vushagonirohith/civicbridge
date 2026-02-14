// main.js

// API Configuration
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbx-yqpyh_AIkcwDSc7emJEVl_JypS7hBdk6yS9DsWgcnmB_Ioeqp2GCwCrIrwfRjAur/exec';

// Global state
const appState = {
    currentUser: null,
    isLoggedIn: false
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('CivicBridge initializing...');
    
    // Initialize modules
    initializeApp();
});

function initializeApp() {
    const preloaderEl = document.getElementById('preloader');
    const loadTime = 2000; // 2 seconds

    setTimeout(() => {
        if (preloaderEl) {
            preloaderEl.style.opacity = '0';
            setTimeout(() => {
                preloaderEl.style.display = 'none';
                
                // Continue with app initialization after preloader hides
                loadUserPreferences();
                setupEventListeners();
                updateAuthUI();
                
                // Initialize maps after a short delay
                setTimeout(() => {
                    if (typeof initMap === 'function') {
                        initMap();
                    }
                }, 100);

            }, 500); // Wait for fade-out animation
        } else {
            // Fallback if preloader isn't found
            loadUserPreferences();
            setupEventListeners();
            updateAuthUI();
        }
    }, loadTime);
}

function loadUserPreferences() {
    loadThemePreference();
    loadNotificationPreferences();
}


function setupEventListeners() {
    // Modal triggers
    document.getElementById('loginBtn')?.addEventListener('click', openLoginModal);
    document.getElementById('signupBtn')?.addEventListener('click', openSignupModal);
    document.getElementById('settingsBtn')?.addEventListener('click', openSettingsModal);
    document.getElementById('reportIssueBtn')?.addEventListener('click', openReportModal);
    document.getElementById('showReportModal')?.addEventListener('click', openReportModal);
    document.getElementById('viewDashboardBtn')?.addEventListener('click', showDashboardAlert);

    // Enhanced modal close handling
    setupModalCloseListeners();

    // Cancel buttons
    document.getElementById('cancelReport')?.addEventListener('click', closeAllModals);

    // Modal switches
    document.getElementById('showSignupModal')?.addEventListener('click', function(e) {
        e.preventDefault();
        closeAllModals();
        setTimeout(openSignupModal, 200);
    });
    
    document.getElementById('showLoginModal')?.addEventListener('click', function(e) {
        e.preventDefault();
        closeAllModals();
        setTimeout(openLoginModal, 200);
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Smooth scrolling for navigation
    document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Location button listeners (Handles map section button)
    document.getElementById('useMyLocation')?.addEventListener('click', useCurrentLocation);
}

// Enhanced modal close listeners
function setupModalCloseListeners() {
    // Close buttons (×)
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
}

// Modal functions
function openLoginModal() {
    closeAllModals();
    document.getElementById('loginModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function openSignupModal() {
    closeAllModals();
    document.getElementById('signupModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function openSettingsModal() {
    closeAllModals();
    document.getElementById('settingsModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    // Populate profile data immediately when modal opens/tab is active
    window.showProfileDetails(); 
}

function openReportModal() {
    if (!checkLoginStatus()) {
        showAlert('Please login to report an issue', 'info');
        openLoginModal();
        return;
    }
    closeAllModals();
    document.getElementById('reportModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Utility functions
function checkLoginStatus() {
    return localStorage.getItem('authToken') !== null;
}

function getAuthToken() {
    return localStorage.getItem('authToken');
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const heroReportBtn = document.getElementById('reportIssueBtn'); // Select hero button
    const mapReportBtn = document.getElementById('showReportModal'); // Select map section button
    
    const isLoggedIn = checkLoginStatus();
    const isAdminUser = isAdmin();
    
    // Handle visibility of "Report an Issue" button for admin users
    if (isAdminUser) {
        if (heroReportBtn) heroReportBtn.style.display = 'none';
        if (mapReportBtn) mapReportBtn.style.display = 'none';
    } else {
        if (heroReportBtn) heroReportBtn.style.display = 'inline-block';
        if (mapReportBtn) mapReportBtn.style.display = 'inline-block';
    }

    if (isLoggedIn) {
        const userName = localStorage.getItem('userName') || 'User';
        const userRole = localStorage.getItem('userRole');
        
        if (isAdminUser) {
            authButtons.innerHTML = `
                <div class="user-info">
                    <i class="fas fa-user-shield"></i>
                    <span>${userName}</span>
                </div>
                <button class="btn btn-warning" id="adminPanelBtn">
                    <i class="fas fa-cog"></i> Admin
                </button>
                <button class="btn btn-outline" id="logoutBtn">Logout</button>
            `;
            
            document.getElementById('logoutBtn').addEventListener('click', window.logout);
            document.getElementById('adminPanelBtn').addEventListener('click', showAdminPanel);
        } else {
            authButtons.innerHTML = `
                <div class="user-info">
                    <i class="fas fa-user"></i>
                    <span>${userName.split(' ')[0]}</span>
                </div>
                <button class="btn btn-outline" id="logoutBtn">Logout</button>
            `;
            
            document.getElementById('logoutBtn').addEventListener('click', window.logout);
        }
    } else {
        authButtons.innerHTML = `
            <button class="btn btn-outline" id="loginBtn">Login</button>
            <button class="btn btn-primary" id="signupBtn">Sign Up</button>
            <button class="btn btn-secondary" id="adminLoginBtn">
                <i class="fas fa-user-shield"></i> Admin
            </button>
        `;
        
        // Reattach event listeners
        document.getElementById('loginBtn')?.addEventListener('click', openLoginModal);
        document.getElementById('signupBtn')?.addEventListener('click', openSignupModal);
        document.getElementById('adminLoginBtn')?.addEventListener('click', openAdminLoginModal);
    }
}

function showProfileDetails() {
    const profileInfoEl = document.getElementById('profileInfo');
    if (!profileInfoEl) return;
    
    if (!checkLoginStatus()) {
        profileInfoEl.innerHTML = '<p style="color: var(--danger); font-weight: 500;">You are currently logged out. Please log in to see your profile details.</p>';
        return;
    }
    
    const userData = getCurrentUser();
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || 'No email';
    const userRole = localStorage.getItem('userRole') || 'User';
    
    // Get stats from local storage/dashboard helper
    let totalReports = 0;
    let resolvedReports = 0;
    
    try {
        const userReports = window.getUserIssues ? window.getUserIssues() : []; // Defined in dashboard.js
        totalReports = userReports.length;
        resolvedReports = userReports.filter(i => i.status === 'resolved').length;
    } catch (e) {
        console.warn("Could not load user reports for profile tab:", e);
    }

    const joinDate = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown';
    const lastActive = userData.profile?.lastActive ? new Date(userData.profile.lastActive).toLocaleString() : 'Unknown';
    const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;
    
    profileInfoEl.innerHTML = `
        <div class="detail-grid" style="margin-top: 15px;">
            <div class="detail-item"><strong>Name:</strong> ${userName}</div>
            <div class="detail-item"><strong>Email:</strong> ${userEmail}</div>
            <div class="detail-item"><strong>Role:</strong> <span style="text-transform: capitalize;">${userRole}</span></div>
            <div class="detail-item"><strong>Member Since:</strong> ${joinDate}</div>
            <div class="detail-item full-width"><strong>Last Active:</strong> ${lastActive}</div>
        </div>
        
        <div class="profile-stats" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
            <h3><i class="fas fa-chart-bar"></i> Reporting Activity</h3>
            <div class="detail-grid">
                <div class="detail-item"><strong>Total Reports:</strong> ${totalReports}</div>
                <div class="detail-item"><strong>Resolved:</strong> ${resolvedReports}</div>
                <div class="detail-item full-width"><strong>Resolution Rate:</strong> ${resolutionRate}%</div>
            </div>
        </div>
    `;
}

function showAdminPanel() {
    if (typeof loadAdminDashboard === 'function') {
        loadAdminDashboard();
    }
    // Scroll to dashboard section
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        dashboardSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function showDashboardAlert() {
    if (!checkLoginStatus()) {
        showAlert('Please login to view your dashboard', 'info');
        openLoginModal();
        return;
    }
    // Load dashboard if logged in
    if (typeof loadDashboard === 'function') {
        loadDashboard();
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            dashboardSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

async function useCurrentLocation() {
    const button = document.getElementById('useMyLocation');
    
    if (button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        button.disabled = true;
    }

    try {
        if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
        }

        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });

        const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };

        console.log('Location fetched:', location);
        
        // Use the location in your maps
        if (window.communityMap) {
            const googleLocation = new google.maps.LatLng(location.lat, location.lng);
            window.communityMap.setCenter(googleLocation);
            window.communityMap.setZoom(14);
        }
        
        // Note: The reportManager.placeMarker logic is also handled inside report.js's useCurrentLocation 
        // which this button does not directly call, so we call it explicitly here for map view use.
        if (window.reportMap && window.reportManager) {
            const googleLocation = new google.maps.LatLng(location.lat, location.lng);
            window.reportMap.setCenter(googleLocation);
            window.reportMap.setZoom(16);
            window.reportManager.placeMarker(googleLocation);
        }

        showAlert('Location found successfully!', 'success');
        
    } catch (error) {
        console.error('Location error:', error);
        handleLocationError(error);
    } finally {
        if (button) {
            button.innerHTML = '<i class="fas fa-location-arrow"></i> Use My Location';
            button.disabled = false;
        }
    }
}

function handleLocationError(error) {
    let message = 'Could not get your location. ';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += 'Please allow location access in your browser settings.';
            break;
        case error.POSITION_UNAVAILABLE:
            message += 'Your location is unavailable.';
            break;
        case error.TIMEOUT:
            message += 'Location request timed out. Please try again.';
            break;
        default:
            message += 'Please try again or use manual location search.';
            break;
    }
    
    showAlert(message, 'error');
}

// Alert system
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <span class="alert-message">${message}</span>
            <button class="alert-close">&times;</button>
        </div>
    `;

    document.body.appendChild(alert);

    // Close button event
    alert.querySelector('.alert-close').addEventListener('click', () => {
        alert.remove();
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Theme management
function applyTheme(theme) {
    if (theme === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('CivicBridge-theme') || 'light';
    applyTheme(savedTheme);
    
    // Update theme options in settings modal
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        if (option.getAttribute('data-theme') === savedTheme) {
            option.classList.add('active');
        }
    });
}

function loadNotificationPreferences() {
    const pushEnabled = localStorage.getItem('CivicBridge-push') !== 'false';
    const emailEnabled = localStorage.getItem('CivicBridge-email') !== 'false';
    
    const pushNotifications = document.getElementById('pushNotifications');
    const emailUpdates = document.getElementById('emailUpdates');
    
    if (pushNotifications) pushNotifications.checked = pushEnabled;
    if (emailUpdates) emailUpdates.checked = emailEnabled;
}

// Add this function to check admin status
function isAdmin() {
    return localStorage.getItem('userRole') === 'admin' && (localStorage.getItem('adminToken') !== null || localStorage.getItem('authToken') !== null);
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch (error) {
        return {};
    }
}

// Add admin modal opener function
function openAdminLoginModal() {
    if (typeof openAdminLoginModal === 'function') {
        // This function is defined in auth.js
        window.openAdminLoginModal();
    } else {
        showAlert('Admin login system not loaded properly', 'error');
    }
}

// main.js

// ... (existing code) ...

function initializeApp() {
    const preloaderEl = document.getElementById('preloader');
    const loadTime = 2000; // 2 seconds

    setTimeout(() => {
        if (preloaderEl) {
            preloaderEl.style.opacity = '0'; // Start fade out
            setTimeout(() => {
                preloaderEl.style.display = 'none'; // Hide after fade out
                
                // Continue with app initialization after preloader hides
                loadUserPreferences();
                setupEventListeners();
                updateAuthUI();
                
                // Initialize maps after a short delay
                setTimeout(() => {
                    if (typeof initMap === 'function') {
                        initMap();
                    }
                }, 100);

            }, 500); // Wait for fade-out animation (0.5s as defined in CSS transition)
        } else {
            // Fallback if preloader isn't found
            loadUserPreferences();
            setupEventListeners();
            updateAuthUI();
        }
    }, loadTime); // Preloader visible for `loadTime` duration
}

// ... (rest of the main.js code) ...

// Make sure admin functions are available globally
window.loadAdminDashboard = loadAdminDashboard;
window.showAdminPanel = showAdminPanel;

// Make functions globally available
window.showAlert = showAlert;
window.checkLoginStatus = checkLoginStatus;
window.getAuthToken = getAuthToken;
window.API_BASE_URL = API_BASE_URL;
window.openReportModal = openReportModal;
window.closeAllModals = closeAllModals;
window.isAdmin = isAdmin;
window.getCurrentUser = getCurrentUser;
window.applyTheme = applyTheme; 
window.showProfileDetails = showProfileDetails;