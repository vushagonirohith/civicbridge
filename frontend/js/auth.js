// Auth form handlers
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    document.getElementById('adminLoginBtn')?.addEventListener('click', openAdminLoginModal);
});

function openAdminLoginModal() {
    if (!document.getElementById('adminLoginModal')) {
        createAdminLoginModal();
    }
    document.getElementById('adminLoginModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function createAdminLoginModal() {
    const adminModal = document.createElement('div');
    adminModal.id = 'adminLoginModal';
    adminModal.className = 'modal';
    adminModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <div class="login-header">
                <h2><i class="fas fa-user-shield"></i> Admin Login</h2>
                <p>Access administrative controls</p>
            </div>
            <form id="adminLoginForm">
                <div class="form-group">
                    <label for="adminEmail">Email</label>
                    <input type="email" id="adminEmail" class="form-control" placeholder="Enter admin email" required>
                </div>
                <div class="form-group">
                    <label for="adminPassword">Password</label>
                    <input type="password" id="adminPassword" class="form-control" placeholder="Enter admin password" required>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary btn-large" style="width: 100%;">
                        <i class="fas fa-sign-in-alt"></i> Admin Login
                    </button>
                </div>
            </form>
            <div class="login-footer">
                <p><strong>Contact system administrator for credentials</strong></p>
            </div>
        </div>
    `;

    document.body.appendChild(adminModal);

    adminModal.querySelector('.close').addEventListener('click', () => {
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    adminModal.querySelector('#adminLoginForm').addEventListener('submit', handleAdminLogin);

    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

async function handleAdminLogin(e) {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        showAlert('Please enter email and password', 'error');
        return;
    }

    try {
        showAlert('Authenticating admin...', 'info');

        const result = await apiService.adminLogin(email, password);

        if (result.success) {
            const user = result.user;

            localStorage.setItem('adminToken', 'admin-token-' + Date.now());
            localStorage.setItem('adminUser', user.name);
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('authToken', 'admin-token-' + Date.now());
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('currentUser', JSON.stringify(user));

            showAlert('Admin login successful!', 'success');
            document.getElementById('adminLoginModal').style.display = 'none';
            document.body.style.overflow = 'auto';

            updateAuthUI();

            if (typeof loadAdminDashboard === 'function') {
                loadAdminDashboard();
            }

            e.target.reset();
        } else {
            showAlert(result.error || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showAlert('Admin login failed. Please try again.', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        showAlert('Creating account...', 'info');

        const result = await apiService.signup(email, name, password);

        if (result.success) {
            showAlert('Account created successfully! Please log in.', 'success');
            e.target.reset();
            document.getElementById('signupModal').style.display = 'none';
            document.getElementById('loginModal').style.display = 'block';
            document.getElementById('email').value = email;
        } else {
            showAlert(result.error || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('An error occurred during signup', 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    try {
        showAlert('Logging in...', 'info');

        const result = await apiService.login(email, password);

        if (result.success) {
            const user = result.user;

            localStorage.setItem('authToken', 'auth-token-' + Date.now());
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userName', user.name);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('userRole', user.role || 'user');
            localStorage.setItem('currentUser', JSON.stringify(user));

            showAlert('Login successful!', 'success');
            document.getElementById('loginModal').style.display = 'none';
            document.body.style.overflow = 'auto';

            updateAuthUI();

            if (typeof loadUserDashboard === 'function') {
                loadUserDashboard();
            }

            e.target.reset();
        } else {
            showAlert(result.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login', 'error');
    }
}

function logout() {
    ['authToken', 'userEmail', 'userName', 'userId', 'userRole',
     'adminToken', 'adminUser', 'currentUser'].forEach(k => localStorage.removeItem(k));

    showAlert('Logged out successfully', 'success');
    updateAuthUI();

    setTimeout(() => window.location.reload(), 1000);
}

// Helpers used by other scripts
function checkLoginStatus() {
    return !!localStorage.getItem('authToken');
}

function isAdmin() {
    return localStorage.getItem('userRole') === 'admin';
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch (e) {
        return {};
    }
}