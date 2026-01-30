
// Config is loaded from config.js

class DashboardLoader {
    constructor() {
        // Module Registry: Maps DOM ID triggers to Script Paths and Class Names
        this.registry = [
            { triggerId: 'focusChart', script: 'modules/FocusModule.js', className: 'FocusModule', key: 'focus' },
            { triggerId: 'appsChart', script: 'modules/AppsModule.js', className: 'AppsModule', key: 'apps' },
            { triggerId: 'coffee-count', script: 'modules/CoffeeModule.js', className: 'CoffeeModule', key: 'coffee' },
            { triggerId: 'presence-val', script: 'modules/PresenceModule.js', className: 'PresenceModule', key: 'presence' },
            { triggerId: 'presenceChart', script: 'modules/PresenceModule.js', className: 'PresenceModule', key: 'presence' }, // Redundant but safe
            { triggerId: 'activity-rows', script: 'modules/ActivityModule.js', className: 'ActivityModule', key: 'activity' },
            { triggerId: 'attentionChart', script: 'modules/AttentionModule.js', className: 'AttentionModule', key: 'attention' },
            { triggerId: 'efficiency-rows', script: 'modules/AttentionModule.js', className: 'AttentionModule', key: 'attention_admin' },
            { triggerId: 'export-user-report-btn', script: 'modules/ReportModule.js', className: 'ReportModule', key: 'report' }
        ];

        this.loadedScripts = new Set();
        this.modules = {}; // Store instances

        this.init();
    }

    async init() {
        try {
            // 1. Load Core Service
            await this.loadScript('core/AppwriteService.js');

            if (typeof AppwriteService === 'undefined') {
                throw new Error("Critical: AppwriteService could not be loaded.");
            }

            // 2. Initialize Appwrite
            this.appwrite = new AppwriteService();

            // 3. Check Auth & Permissions
            await this.checkAuth();

            // 4. Setup Global UI (Sidebar, Logout)
            this.setupUI();

            // 5. Load & Run Required Modules
            await this.boostrapModules();

        } catch (err) {
            console.error("Dashboard Initialization Failed:", err);
            // Optional: Show error toast to user
        }
    }

    async loadScript(path) {
        if (this.loadedScripts.has(path)) return; // Already loaded

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `../assets/js/${path}?v=${new Date().getTime()}`; // Cache busting
            script.onload = () => {
                this.loadedScripts.add(path);
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load script: ${path}`));
            document.body.appendChild(script);
        });
    }

    async boostrapModules() {
        const loadPromises = [];
        const modulesToLoad = new Map(); // key -> { script, className }

        // Determine which modules are needed
        this.registry.forEach(entry => {
            if (document.getElementById(entry.triggerId)) {
                if (!modulesToLoad.has(entry.key)) {
                    modulesToLoad.set(entry.key, entry);
                }
            }
        });

        // Load Scripts in Parallel
        for (const [key, entry] of modulesToLoad) {
            loadPromises.push(
                this.loadScript(entry.script).then(() => {
                    // Instantiate after load
                    if (window[entry.className] && !this.modules[key]) {
                        // Pass appwrite service if constructor expects it
                        // (ReportModule doesn't need it, others do)
                        try {
                            this.modules[key] = new window[entry.className](this.appwrite);
                            if (this.modules[key].init) {
                                this.modules[key].init();
                            }
                        } catch (e) {
                            console.error(`Error initializing ${entry.className}:`, e);
                        }
                    }
                })
            );
        }

        await Promise.all(loadPromises);
    }

    async checkAuth() {
        try {
            const user = await this.appwrite.getUser();

            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.innerText = user.name || user.email;

            const isAdmin = user.labels && user.labels.includes('admin');

            // UI visibility based on permissions
            const adminNav = document.getElementById('nav-admin');
            const usersNav = document.getElementById('nav-users');
            if (adminNav) adminNav.style.display = isAdmin ? 'flex' : 'none';
            if (usersNav) usersNav.style.display = isAdmin ? 'flex' : 'none';

            sessionStorage.setItem('isAdmin', isAdmin);

            // Page Protection
            const path = window.location.pathname;
            if (path.includes('admin.html') || path.includes('users.html')) {
                if (!isAdmin) {
                    window.location.href = 'dashboard.html';
                    return;
                }
                // Legacy Admin Script Loading (if we haven't refactored admin.js fully yet)
                this.loadLegacyPageScripts(path);
            }

        } catch (e) {
            const path = window.location.pathname;
            if (!path.includes('login.html') && !path.includes('index.html')) {
                window.location.href = 'login.html';
            }
        }
    }

    loadLegacyPageScripts(path) {
        const scriptName = path.includes('admin.html') ? 'admin.js' : 'users.js';
        this.loadScript(`${scriptName}`).then(() => {
            if (scriptName === 'admin.js' && window.initAdmin) window.initAdmin();
            if (scriptName === 'users.js' && window.initUsers) window.initUsers();
        });
    }

    setupUI() {
        // Chart Defaults
        if (typeof Chart !== 'undefined') {
            Chart.defaults.color = '#888';
            Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
            Chart.defaults.font.family = "'Inter', sans-serif";
        }

        // Sidebar & Logout Logic
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

            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                    if (!sidebar.contains(e.target) && (!mobileToggle || !mobileToggle.contains(e.target))) {
                        sidebar.classList.remove('active');
                    }
                }
            });
        }

        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.appwrite.logout();
                window.location.href = '../index.html';
            });
        }
    }
}

// Start Loader
document.addEventListener('DOMContentLoaded', () => {
    window.loader = new DashboardLoader();
});
