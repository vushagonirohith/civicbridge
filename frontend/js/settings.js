class SettingsManager {
    constructor(app) {
        // App is not fully passed, relying on global scope for app functions (showAlert, applyTheme)
        this.init();
    }

    init() {
        this.setupModalEvents();
        this.setupTabNavigation();
        this.setupThemeSwitcher();
        this.setupNotificationSettings();
    }

    setupModalEvents() {
        const settingsModal = document.getElementById('settingsModal');
        if (!settingsModal) return;

        // Close modal
        settingsModal.querySelector('.close')?.addEventListener('click', () => {
            this.closeSettingsModal();
        });

        // Close when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeSettingsModal();
            }
        });
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('#settingsModal .tab-btn');
        const tabPanes = document.querySelectorAll('#settingsModal .tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;

                // Update active button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // If opening profile tab, load data
                if (targetTab === 'profile' && typeof window.showProfileDetails === 'function') {
                    window.showProfileDetails();
                }

                // Show target tab
                tabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `${targetTab}-tab`) {
                        pane.classList.add('active');
                    }
                });
            });
        });
    }

    setupThemeSwitcher() {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.setTheme(theme);
                
                // Update active theme option
                themeOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });

        // Set initial active theme based on saved preference
        const currentTheme = localStorage.getItem('CivicBridge-theme') || 'light';
        const currentThemeOption = document.querySelector(`.theme-option[data-theme="${currentTheme}"]`);
        if (currentThemeOption) {
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
            currentThemeOption.classList.add('active');
        }
    }

    setupNotificationSettings() {
        const pushNotifications = document.getElementById('pushNotifications');
        const emailUpdates = document.getElementById('emailUpdates');

        if (pushNotifications) {
            pushNotifications.addEventListener('change', (e) => {
                this.saveNotificationSetting('CivicBridge-push', e.target.checked);
            });
        }

        if (emailUpdates) {
            emailUpdates.addEventListener('change', (e) => {
                this.saveNotificationSetting('CivicBridge-email', e.target.checked);
            });
        }
    }

    setTheme(theme) {
        window.applyTheme(theme); // Use global applyTheme from main.js
        localStorage.setItem('CivicBridge-theme', theme);
        window.showAlert(`Theme changed to ${theme} mode`, 'success');
        
        // Update map styles globally if maps are loaded
        if (window.reportMap && typeof window.reportManager.getMapStyle === 'function') {
            window.reportMap.setOptions({ styles: window.reportManager.getMapStyle() });
        }
        if (window.communityMap && typeof window.getMapStyle === 'function') {
            window.communityMap.setOptions({ styles: window.getMapStyle() });
        }
    }

    saveNotificationSetting(settingKey, value) {
        localStorage.setItem(settingKey, value);
        window.showAlert(`Notification settings updated`, 'success');
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

// Initialize SettingsManager
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});