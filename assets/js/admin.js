// Admin Console - Logic loaded dynamically by dashboard.js

let selectedUserId = null; // null means "All Users"
let activeUsers = [];
let userNamesMap = {}; // Maps ID to Name
let charts = { focus: null, apps: null };

// Time Filters State
let filters = {
    focus: '24h',
    apps: '24h',
    activity: 'all'
};

async function initAdmin() {
    try {
        const user = await account.get();
        const isAdmin = user.labels && user.labels.includes('admin');

        if (!isAdmin) {
            window.location.href = 'dashboard.html';
            return;
        }

        document.getElementById('user-name').innerText = user.name || user.email;

        // Handle URL Parameter for User Selection
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('u');
        if (userParam) {
            selectedUserId = userParam;
        }

        // Initialize Filter Listeners
        initFilterListeners();

        // Initial Fetch
        await refreshAdminData();

        // Setup Realtime Subscription
        client.subscribe([
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.ACTIVITY}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.COFFEE}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.PRESENCE}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.USERS}.documents`
        ], response => {
            refreshAdminData();
        });
    } catch (err) {
        console.error("Admin Init Error:", err);
        // Only redirect if it's explicitly an auth error
        if (err.code === 401) window.location.href = 'login.html';
    }
}

function initFilterListeners() {
    document.querySelectorAll('.time-filters').forEach(group => {
        const target = group.dataset.target;
        group.querySelectorAll('.filter-option').forEach(opt => {
            opt.addEventListener('click', () => {
                // Update UI
                group.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');

                // Update State and Refresh specific component
                filters[target] = opt.dataset.range;
                refreshComponent(target);
            });
        });
    });
}

async function refreshComponent(target) {
    // Helper to refresh just one part of the dashboard
    if (target === 'focus') await updateFocusParams();
    if (target === 'apps') await updateAppsParams();
    if (target === 'activity') await updateActivityParams();
}

function getDateFromRange(range) {
    const now = new Date();
    if (range === '24h') return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    if (range === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (range === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    return null; // 'all'
}

async function refreshAdminData() {
    // 1. Fetch Users first (static list usually)
    const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(100)]);
    usersResponse.documents.forEach(doc => {
        if (doc.name) userNamesMap[doc.$id] = doc.name;
    });

    const users = new Set();
    usersResponse.documents.forEach(doc => users.add(doc.$id));
    activeUsers = Array.from(users);
    renderUserList(activeUsers);

    // 2. Fetch Components with their specific filters
    await updateFocusParams();
    await updateAppsParams();
    await updateActivityParams();
    await updateHeaderStats(); // Keep header stats global/24h for now or link to focus?
}

// Specialized Updaters
async function updateFocusParams() {
    const queries = [Query.limit(100), Query.orderDesc('$createdAt')];

    if (selectedUserId) {
        // Appwrite requires an index on userId for this to work efficently
        queries.push(Query.equal('userId', selectedUserId));
    }

    const date = getDateFromRange(filters.focus);
    if (date) queries.push(Query.greaterThanEqual('$createdAt', date));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, queries);
    renderFocusChart(response.documents);
}

async function updateAppsParams() {
    const queries = [Query.limit(100)];

    if (selectedUserId) {
        queries.push(Query.equal('userId', selectedUserId));
    }

    const date = getDateFromRange(filters.apps);
    if (date) queries.push(Query.greaterThanEqual('$createdAt', date));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, queries);
    renderAppsChart(response.documents);
}

async function updateActivityParams() {
    const queries = [Query.limit(100), Query.orderDesc('$createdAt')];

    if (selectedUserId) {
        queries.push(Query.equal('userId', selectedUserId));
    }

    const date = getDateFromRange(filters.activity);
    if (date) queries.push(Query.greaterThanEqual('$createdAt', date));

    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, queries);
    renderActivityTable(response.documents);
}

async function updateHeaderStats() {
    // Keeping this simple: Header stats usually reflect "Right Now" or "Today"
    const activityResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.limit(100), Query.orderDesc('$createdAt')]);
    const coffeeResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COFFEE, [Query.limit(100)]);

    document.getElementById('stat-total-users').innerText = activeUsers.length;

    const now = new Date();
    const activeNow = activityResponse.documents.filter(a => (now - new Date(a.$createdAt)) < 300000).length;
    document.getElementById('stat-active-now').innerText = activeNow;

    const avgFocus = activityResponse.documents.length > 0 ? Math.round(activityResponse.documents.reduce((sum, a) => sum + (a.duration || 0), 0) / activityResponse.documents.length) : 0;
    document.getElementById('stat-avg-focus').innerText = avgFocus + 'm';

    document.getElementById('stat-coffee-24h').innerText = coffeeResponse.documents.length;
}

function renderUserList(users) {
    const listEl = document.getElementById('user-list');
    // "All Users" Pill
    const allUsersActive = selectedUserId === null ? 'active' : '';
    const allUsersPill = `
        <div class="user-pill ${allUsersActive}" onclick="selectUser(null)" style="border-style: dashed; margin-right: 0.5rem;">
            All Users
        </div>`;

    const userPills = users.map(u => {
        const displayName = userNamesMap[u] || (u.includes('@') ? u.split('@')[0] : u);
        return `
            <div class="user-pill ${selectedUserId === u ? 'active' : ''}" onclick="selectUser('${u}')">
                ${displayName.length > 20 ? displayName.substring(0, 15) + '...' : displayName}
            </div>
        `;
    }).join('');

    listEl.innerHTML = allUsersPill + userPills;
}

function selectUser(userId) {
    selectedUserId = userId; // if null, filters are removed

    // UI Update immediately for responsiveness
    document.querySelectorAll('.user-pill').forEach(el => el.classList.remove('active'));
    // Re-render list to update active state correctly
    renderUserList(activeUsers);

    refreshAdminData();
}

function renderActivityTable(docs) {
    const tbody = document.getElementById('activity-rows');
    const filtered = selectedUserId ? docs.filter(d => (d.userId === selectedUserId || d.userEmail === selectedUserId)) : docs;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.5; padding: 2rem;">No activity in this range</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.slice(0, 15).map(doc => {
        const user = doc.userId || doc.userEmail || "Unknown";
        const app = doc.app_used || "-";
        const duration = doc.duration ? `${Math.round(doc.duration / 60)}m` : "-";
        const time = new Date(doc.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <tr>
                <td style="color: var(--accent-color);">${user.substring(0, 12)}...</td>
                <td style="color: #fff;">${app}</td>
                <td>${duration}</td>
                <td style="opacity: 0.5;">${time}</td>
            </tr>
        `;
    }).join('');
}

function renderFocusChart(docs) {
    const canvas = document.getElementById('focusChart');
    if (!canvas) return;

    const filtered = selectedUserId ? docs.filter(d => (d.userId === selectedUserId || d.userEmail === selectedUserId)) : docs;

    const hourlyData = {};
    filtered.forEach(doc => {
        const d = new Date(doc.$createdAt);
        // If range > 24h, group by Day, else by Hour
        let label;
        if (filters.focus === '24h') {
            label = `${d.getHours()}:00`;
        } else {
            label = `${d.getMonth() + 1}/${d.getDate()}`;
        }
        hourlyData[label] = (hourlyData[label] || 0) + (doc.duration || 0);
    });

    const labels = Object.keys(hourlyData).sort(); // Sort logic might need improvement for mixed dates
    const data = labels.map(l => hourlyData[l]);

    if (charts.focus) charts.focus.destroy();
    charts.focus = new Chart(canvas, {
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
            plugins: { legend: { display: false } }
        }
    });
}

function renderAppsChart(docs) {
    const canvas = document.getElementById('appsChart');
    if (!canvas) return;

    const filtered = selectedUserId ? docs.filter(d => (d.userId === selectedUserId || d.userEmail === selectedUserId)) : docs;

    const appTotals = {};
    filtered.forEach(doc => {
        const app = doc.app_used || "Unknown";
        appTotals[app] = (appTotals[app] || 0) + (doc.duration || 0);
    });

    const sorted = Object.entries(appTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => Math.round(s[1]));

    if (charts.apps) charts.apps.destroy();
    charts.apps = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Global Usage',
                data: data,
                backgroundColor: '#fff',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// Global functions
window.initAdmin = initAdmin;
window.selectUser = selectUser;

// Export Report Logic
document.getElementById('export-report-btn')?.addEventListener('click', generateReport);

async function generateReport() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Create new window for print
    const printWindow = window.open('', '_blank');

    // Convert Chart Canvas to Image
    const focusImg = document.getElementById('focusChart').toDataURL('image/png');
    const appsImg = document.getElementById('appsChart').toDataURL('image/png');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Panopticon Admin Report</title>
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
            </style>
        </head>
        <body>
            <h1>Panopticon Admin Report</h1>
            <h2>Organization: Panopticon HQ<br>Date: ${dateStr}</h2>

            <div class="section-title">Team Overview</div>
            <table style="width: 50%;">
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Users</td><td>${activeUsers.length}</td></tr>
                <tr><td>Active Now</td><td>${document.getElementById('stat-active-now').innerText}</td></tr>
                <tr><td>Avg. Focus</td><td>${document.getElementById('stat-avg-focus').innerText}</td></tr>
            </table>

            <div class="grid">
                <div>
                    <div class="section-title">Aggregate Screen Time Trend</div>
                    <img src="${focusImg}" class="chart-img">
                </div>
                <div>
                    <div class="section-title">App Usage Share</div>
                    <img src="${appsImg}" class="chart-img">
                </div>
            </div>

            <div class="section-title">Most Recent Global Activity</div>
            <table>
                 <thead>
                    <tr>
                        <th>User</th>
                        <th>App</th>
                        <th>Duration</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${document.getElementById('activity-rows').innerHTML}
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
}
