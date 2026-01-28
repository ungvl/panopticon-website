const { Client, Databases, Query, Account } = Appwrite;

// Config is loaded from config.js
const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const databases = new Databases(client);
const account = new Account(client);

// Chart Instances
let focusChartInstance = null;
let appsChartInstance = null;
let presenceChartInstance = null;

const initDashboard = async () => {
    // Check for admin label & Handle Dynamic Module Loading
    try {
        const user = await account.get();
        const isAdmin = user.labels && user.labels.includes('admin');
        const adminNav = document.getElementById('nav-admin');
        const usersNav = document.getElementById('nav-users');
        if (adminNav) adminNav.style.display = isAdmin ? 'flex' : 'none';
        if (usersNav) usersNav.style.display = isAdmin ? 'flex' : 'none';

        // Sync sessionStorage for other pages
        sessionStorage.setItem('isAdmin', isAdmin);

        // Dynamic Loader: If on an admin page, load the logic only if authorized
        const path = window.location.pathname;
        if (path.includes('admin.html') || path.includes('users.html')) {
            if (!isAdmin) {
                window.location.href = 'dashboard.html';
                return;
            }

            // Load the corresponding script
            const scriptName = path.includes('admin.html') ? 'admin.js' : 'users.js';
            const script = document.createElement('script');
            script.src = `../assets/js/${scriptName}`;
            document.body.appendChild(script);

            // Initialize the specific page logic after script loads
            script.onload = () => {
                if (scriptName === 'admin.js' && window.initAdmin) window.initAdmin();
                if (scriptName === 'users.js' && window.initUsers) window.initUsers();
            };
        }

    } catch (e) {
        // Not logged in or permission issue
        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
            // window.location.href = '../index.html';
        }
    }

    // Config for Chart.js (Dark Mode)
    Chart.defaults.color = '#888';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Silently check connection in background
    databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.limit(1)]).catch(() => { });

    // Run fetches
    if (document.getElementById('focusChart')) fetchFocusData();
    if (document.getElementById('appsChart')) fetchAppUsage();
    if (document.getElementById('coffee-count')) fetchCoffeeCount();
    if (document.getElementById('presence-val')) fetchPresence();
    if (document.getElementById('activity-rows')) fetchRecentActivity();
};

// 1. Focus Time (Aggregated from activity_logs)
const fetchFocusData = async () => {
    const canvas = document.getElementById('focusChart');
    if (!canvas) return;

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]
        );

        const ctx = canvas.getContext('2d');

        let labels = ['09:00', '11:00', '13:00', '15:00', '17:00'];
        let data = [10, 45, 30, 80, 65];

        if (response.documents.length > 0) {
            // Simple aggregation: group by hour and sum duration
            const hourlyData = {};
            response.documents.forEach(doc => {
                const hour = new Date(doc.$createdAt).getHours();
                const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
                hourlyData[timeLabel] = (hourlyData[timeLabel] || 0) + (doc.duration || 0);
            });

            const sortedHours = Object.keys(hourlyData).sort();
            if (sortedHours.length > 0) {
                labels = sortedHours;
                data = sortedHours.map(h => hourlyData[h]);
            }
        }

        if (focusChartInstance) focusChartInstance.destroy();

        focusChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Focus Minutes',
                    data: data,
                    borderColor: '#f7d000',
                    backgroundColor: 'rgba(247, 208, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: true } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (err) {
        console.error("Focus Data Error:", err);
    }
};

// 2. App Usage (Top Apps from activity_logs)
const fetchAppUsage = async () => {
    const canvas = document.getElementById('appsChart');
    if (!canvas) return;

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.limit(100)
            ]
        );

        const ctx = canvas.getContext('2d');

        let labels = ['VS Code', 'Chrome', 'Slack', 'Terminal', 'Figma'];
        let data = [90, 75, 48, 30, 25];

        if (response.documents.length > 0) {
            const appTotals = {};
            response.documents.forEach(doc => {
                const app = doc.app_used || "Unknown";
                appTotals[app] = (appTotals[app] || 0) + (doc.duration || 0);
            });

            const sortedApps = Object.entries(appTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            if (sortedApps.length > 0) {
                labels = sortedApps.map(a => a[0]);
                data = sortedApps.map(a => Math.round(a[1]));
            }
        }

        if (appsChartInstance) appsChartInstance.destroy();

        appsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Usage (min)',
                    data: data,
                    backgroundColor: '#fff',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (err) {
        console.error("App Usage Error:", err);
    }
};

// 3. Coffee Tracker (Real Count)
const fetchCoffeeCount = async () => {
    const countEl = document.getElementById('coffee-count');
    if (!countEl) return;

    try {
        console.log("Fetching Coffee logs...");
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.COFFEE,
            [Query.limit(100)]
        );
        console.log("Coffee Response:", response);
        document.getElementById('coffee-count').innerText = response.total;
    } catch (err) {
        console.error("Coffee Fetch Error:", err);
        const el = document.getElementById('coffee-count');
        if (el) el.innerText = "error";
    }
};

// 4. Presence (Real Status)
const fetchPresence = async () => {
    const statusEl = document.getElementById('presence-val');
    const chartEl = document.getElementById('presenceChart');

    if (!statusEl && !chartEl) return;

    try {
        console.log("Fetching Presence logs...");
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PRESENCE,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(10)
            ]
        );
        console.log("Presence Response:", response);

        if (response.documents.length > 0) {
            const latest = response.documents[0];
            const statusEl = document.getElementById('presence-val');
            const lastSeenEl = document.getElementById('last-seen');

            // Determine status based on recency (within last 5 minutes)
            const lastSeenDate = new Date(latest.$createdAt);
            const now = new Date();
            const diffMinutes = (now - lastSeenDate) / (1000 * 60);
            const isPresent = diffMinutes < 5;

            statusEl.innerText = isPresent ? "Present" : "Away";
            statusEl.style.color = isPresent ? '#f7d000' : '#888';

            const time = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastSeenEl.innerText = `${time}`;

            // Mini Chart Data from last 5 entries
            const recentStatus = response.documents.slice(0, 5).reverse().map(d => {
                const dDate = new Date(d.$createdAt);
                // Simple logic: if log exists, they were present at that time
                return 1;
            });
            renderPresenceMiniChart(recentStatus);
        }
    } catch (err) {
        console.warn("Could not fetch presence:", err);
        renderPresenceMiniChart([0, 0, 0, 0, 0]);
    }
};

const renderPresenceMiniChart = (data) => {
    const canvas = document.getElementById('presenceChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    presenceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1', '2', '3', '4', '5'],
            datasets: [{
                data: data,
                borderColor: '#555',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { display: false }
        }
    });
};

// 5. Recent Activity Table
const fetchRecentActivity = async () => {
    const tbody = document.getElementById('activity-rows');
    if (!tbody) return;

    try {
        console.log("Fetching Activity logs...");
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(10)
            ]
        );
        console.log("Activity Response:", response);

        const tbody = document.getElementById('activity-rows');

        if (!response.documents || response.documents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5;">No entries found in Appwrite. Check permissions?</td></tr>';
            return;
        }

        tbody.innerHTML = response.documents.map(doc => {
            // Log raw doc to see field names if they are different
            // console.log("Activity Doc:", doc);
            const app = doc.app_used || "Unknown";
            const duration = doc.duration ? `${Math.round(doc.duration / 60)}m` : "-";
            const status = "Active";

            return `
                <tr>
                    <td style="color: #fff; font-weight: 500;">${app}</td>
                    <td>${duration}</td>
                    <td style="color: #f7d000">${status}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Activity Fetch Error:", err);
        document.getElementById('activity-rows').innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
    }
};

// Init on load
window.initDashboard = initDashboard;
if (document.readyState === 'complete') {
    // If loaded as standalone script or helper
}


// Mobile and Desktop Menu Logic + Global Listeners
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    // Mobile Drawer
    const mobileToggle = document.getElementById('menu-toggle');
    const collapseBtn = document.getElementById('collapse-btn');
    const sidebar = document.getElementById('sidebar');

    if (sidebar) {
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
            });
        }

        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && (!mobileToggle || !mobileToggle.contains(e.target)) && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await account.deleteSession('current');
                window.location.href = '../index.html';
            } catch (err) { }
        });
    }
});
