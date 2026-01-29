const { Client, Databases, Query, Account } = Appwrite;

// Config is loaded from config.js
const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const databases = new Databases(client);
const account = new Account(client);

// Expose globals for dynamic modules
window.client = client;
window.databases = databases;
window.account = account;
window.Query = Query;
window.Appwrite = Appwrite;

// Chart Instances
let focusChartInstance = null;
let appsChartInstance = null;
let presenceChartInstance = null;

const initDashboard = async () => {
    // Check for admin label & Handle Dynamic Module Loading
    try {
        const user = await account.get();

        // Update UI with User Name
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.innerText = user.name || user.email;

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
            // Cache busting for development
            script.src = `../assets/js/${scriptName}?v=${new Date().getTime()}`;
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
            window.location.href = 'login.html';
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
                // Convert Seconds to Minutes for the Chart
                data = sortedHours.map(h => Math.round(hourlyData[h] / 60));
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
                // Convert Seconds to Minutes for the Chart
                data = sortedApps.map(a => Math.round(a[1] / 60));
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
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.COFFEE,
            [Query.limit(100)]
        );
        document.getElementById('coffee-count').innerText = response.total;
    } catch (err) {
        const el = document.getElementById('coffee-count');
        if (el) el.innerText = "0";
    }
};

// 4. Presence (Real Status)
const fetchPresence = async () => {
    const statusEl = document.getElementById('presence-val');
    const chartEl = document.getElementById('presenceChart');

    if (!statusEl && !chartEl) return;

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PRESENCE,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(10)
            ]
        );

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
            const recentStatus = response.documents.slice(0, 5).reverse().map(d => 1);
            renderPresenceMiniChart(recentStatus);
        }
    } catch (err) {
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

// 5. Daily App Summary (Aggregated)
const fetchRecentActivity = async () => {
    const tbody = document.getElementById('activity-rows');
    if (!tbody) return;

    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();

        // Fetch today's activity (limit 100 for now, could paginate if heavy)
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.greaterThanEqual('$createdAt', startOfDay),
                Query.limit(100)
            ]
        );

        if (!response.documents || response.documents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5;">No activity recorded today.</td></tr>';
            return;
        }

        // Aggregate Data
        const appStats = {};

        response.documents.forEach(doc => {
            const app = doc.app_used || "Unknown";
            const duration = doc.duration || 0;
            const docTime = new Date(doc.$createdAt);

            if (!appStats[app]) {
                appStats[app] = { name: app, totalSeconds: 0, lastSeen: docTime };
            }

            appStats[app].totalSeconds += duration;
            if (docTime > appStats[app].lastSeen) {
                appStats[app].lastSeen = docTime;
            }
        });

        // Convert to Array and Sort
        const sortedApps = Object.values(appStats).sort((a, b) => b.totalSeconds - a.totalSeconds);

        tbody.innerHTML = sortedApps.map(stat => {
            // Smart Duration Formatting
            let durationStr = "-";
            if (stat.totalSeconds < 60) {
                durationStr = `${Math.round(stat.totalSeconds)}s`;
            } else if (stat.totalSeconds < 3600) {
                durationStr = `${Math.round(stat.totalSeconds / 60)}m`;
            } else {
                durationStr = `${(stat.totalSeconds / 3600).toFixed(1)}h`;
            }

            const lastActiveTime = stat.lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <tr>
                    <td style="color: #fff; font-weight: 500;">${stat.name}</td>
                    <td>${durationStr}</td>
                    <td style="color: #888;">${lastActiveTime}</td>
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
// User Report Generation Logic
const setupUserReport = () => {
    const btn = document.getElementById('export-user-report-btn');
    if (btn) btn.addEventListener('click', generateUserReport);
};

const generateUserReport = async () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const userNameEl = document.getElementById('user-name');
    const userName = userNameEl ? userNameEl.innerText : 'User';

    // Create new window for print
    const printWindow = window.open('', '_blank');

    // Convert Chart Canvas to Image (if they exist)
    const focusCanvas = document.getElementById('focusChart');
    const appsCanvas = document.getElementById('appsChart');

    const focusImg = focusCanvas ? focusCanvas.toDataURL('image/png') : '';
    const appsImg = appsCanvas ? appsCanvas.toDataURL('image/png') : '';

    // Get current stats safely
    const coffeeEl = document.getElementById('coffee-count');
    const coffeeVal = coffeeEl ? coffeeEl.innerText : '0';

    const presenceEl = document.getElementById('presence-val');
    const presenceVal = presenceEl ? presenceEl.innerText : '-';

    const lastSeenEl = document.getElementById('last-seen');
    const lastSeenVal = lastSeenEl ? lastSeenEl.innerText : '-';

    const activityRowsEl = document.getElementById('activity-rows');
    const activityRowsVal = activityRowsEl ? activityRowsEl.innerHTML : '<tr><td>No Data</td></tr>';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Panopticon User Report</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 2rem; color: #000; }
                h1 { margin-bottom: 0.5rem; font-size: 24px; }
                h2 { font-size: 14px; color: #666; margin-bottom: 2rem; font-weight: 400; }
                .section-title { font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; font-size: 16px; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 12px; }
                th { background: #f7d000; text-align: left; padding: 8px; border: 1px solid #000; }
                td { padding: 8px; border: 1px solid #ddd; }
                
                .chart-img { width: 100%; height: auto; border: 1px solid #eee; margin-bottom: 1rem; }
                
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
                .stat-box { padding: 1rem; border: 1px solid #eee; border-radius: 8px; }
                .stat-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
                .stat-val { font-size: 24px; font-weight: 700; margin-top: 0.5rem; }
            </style>
        </head>
        <body>
            <h1>Personal Productivity Report</h1>
            <h2>User: ${userName}<br>Date: ${dateStr}</h2>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-label">Coffee Today</div>
                    <div class="stat-val">${coffeeVal}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Status</div>
                    <div class="stat-val">${presenceVal}</div>
                </div>
                 <div class="stat-box">
                    <div class="stat-label">Last Seen</div>
                    <div class="stat-val">${lastSeenVal}</div>
                </div>
            </div>

            <div class="grid">
                <div>
                    <div class="section-title">Focus Time Trend</div>
                    <img src="${focusImg}" class="chart-img">
                </div>
                <div>
                    <div class="section-title">App Usage Distribution</div>
                    <img src="${appsImg}" class="chart-img">
                </div>
            </div>

            <div class="section-title">Recent Activity Log</div>
            <table>
                 <thead>
                    <tr>
                        <th>App</th>
                        <th>Duration</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${activityRowsVal}
                </tbody>
            </table>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

// Initialize User Report Listener
document.addEventListener('DOMContentLoaded', setupUserReport);
