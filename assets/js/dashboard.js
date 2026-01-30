
// Config is loaded from config.js (PROJECT_ID, ENDPOINT, etc.)

// Orchestrator Class
class DashboardApp {
    constructor() {
        this.appwrite = new AppwriteService();

        // Initialize Modules
        this.modules = {
            focus: new FocusModule(this.appwrite),
            apps: new AppsModule(this.appwrite),
            coffee: new CoffeeModule(this.appwrite),
            presence: new PresenceModule(this.appwrite),
            activity: new ActivityModule(this.appwrite),
            attention: new AttentionModule(this.appwrite),
            report: new ReportModule()
        };

        this.init();
    }

    async init() {
        try {
            await this.checkAuth();
            this.setupUI();
            this.runModules();
        } catch (err) {
            console.error("Initialization Error:", err);
        }
    }

    async checkAuth() {
        try {
            const user = await this.appwrite.getUser();

            // Update User Name
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.innerText = user.name || user.email;

            // Admin Logic
            const isAdmin = user.labels && user.labels.includes('admin');
            const adminNav = document.getElementById('nav-admin');
            const usersNav = document.getElementById('nav-users');

            if (adminNav) adminNav.style.display = isAdmin ? 'flex' : 'none';
            if (usersNav) usersNav.style.display = isAdmin ? 'flex' : 'none';

            sessionStorage.setItem('isAdmin', isAdmin);

            // Access Control for Admin Pages
            const path = window.location.pathname;
            if (path.includes('admin.html') || path.includes('users.html')) {
                if (!isAdmin) {
                    window.location.href = 'dashboard.html';
                    return;
                }
                this.loadAdminScripts(path);
            }

        } catch (e) {
            // Redirect to login if not public
            const path = window.location.pathname;
            if (!path.includes('login.html') && !path.includes('index.html')) {
                window.location.href = 'login.html';
            }
        }
    }

    loadAdminScripts(path) {
        const scriptName = path.includes('admin.html') ? 'admin.js' : 'users.js';
        const script = document.createElement('script');
        script.src = `../assets/js/${scriptName}?v=${new Date().getTime()}`;
        document.body.appendChild(script);

        script.onload = () => {
            if (scriptName === 'admin.js' && window.initAdmin) window.initAdmin();
            if (scriptName === 'users.js' && window.initUsers) window.initUsers();
        };
    }

    setupUI() {
        // Chart Defaults
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#888';
            Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
            Chart.defaults.font.family = "'Inter', sans-serif";
        }

        // Layout Listeners
        const mobileToggle = document.getElementById('menu-toggle');
        const collapseBtn = document.getElementById('collapse-btn');
        const sidebar = document.getElementById('sidebar');

        if (sidebar) {
            if (mobileToggle) mobileToggle.addEventListener('click', () => sidebar.classList.toggle('active'));
            if (collapseBtn) {
                collapseBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('collapsed');
                    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
                });
            }
            if (localStorage.getItem('sidebar-collapsed') === 'true') sidebar.classList.add('collapsed');

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                    if (!sidebar.contains(e.target) && (!mobileToggle || !mobileToggle.contains(e.target))) {
                        sidebar.classList.remove('active');
                    }
                }
            });
        }

        // Logout Listener
        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.appwrite.logout();
                window.location.href = '../index.html';
            });
        }
    }

    runModules() {
        // Run all modules that have an init method
        Object.values(this.modules).forEach(module => {
            if (module.init) module.init();
        });

        // Background check (keep connection alive or debug)
        this.appwrite.listDocuments(COLLECTIONS.ACTIVITY, [this.appwrite.Query.limit(1)]).catch(() => { });
    }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DashboardApp();
});
