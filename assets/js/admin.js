// Admin Console - Logic loaded dynamically by dashboard.js

let selectedUserId = null; // null means "All Users"
let activeUsers = [];
let userNamesMap = {}; // Maps ID to Name
let charts = { focus: null, apps: null };

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

async function refreshAdminData() {

    // 1. Fetch all data to determine users and global stats
    const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(100)]);
    const activityResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.limit(100), Query.orderDesc('$createdAt')]);
    const coffeeResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COFFEE, [Query.limit(100)]);
    const presenceResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRESENCE, [Query.limit(100)]);

    // Update Name Map
    usersResponse.documents.forEach(doc => {
        userNamesMap[doc.$id] = doc.name;
    });

    // 2. Extract unique users
    const users = new Set();
    // Add all registered users first
    usersResponse.documents.forEach(doc => {
        users.add(doc.$id);
        if (doc.name) userNamesMap[doc.$id] = doc.name;
    });

    // Add any legacy users found in logs
    activityResponse.documents.forEach(doc => {
        const uid = doc.userId || doc.userEmail || (doc.users && doc.users.$id) || "Unknown";
        const name = doc.name || (doc.users && doc.users.name);

        users.add(uid);
        if (name && !userNamesMap[uid]) userNamesMap[uid] = name;
    });

    activeUsers = Array.from(users);
    renderUserList(activeUsers);

    updateHeaderStats(activityResponse.documents, coffeeResponse.documents, activeUsers.length);
    renderActivityTable(activityResponse.documents);
    renderCharts(activityResponse.documents);
}

function renderUserList(users) {
    const listEl = document.getElementById('user-list');
    const allUsersPill = `<div class="user-pill" onclick="window.location.href='users.html'" style="border-style: dashed; opacity: 0.8; margin-right: 0.5rem;">← User Directory</div>`;

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
    selectedUserId = userId;
    refreshAdminData();
}

function updateHeaderStats(activities, coffee, userCount) {
    document.getElementById('stat-total-users').innerText = userCount;

    const now = new Date();
    const activeNow = activities.filter(a => (now - new Date(a.$createdAt)) < 300000).length; // Active in last 5m
    document.getElementById('stat-active-now').innerText = activeNow;

    const avgFocus = activities.length > 0 ? Math.round(activities.reduce((sum, a) => sum + (a.duration || 0), 0) / activities.length) : 0;
    document.getElementById('stat-avg-focus').innerText = avgFocus + 'm';

    document.getElementById('stat-coffee-24h').innerText = coffee.length;
}

function renderActivityTable(docs) {
    const tbody = document.getElementById('activity-rows');
    const filtered = selectedUserId ? docs.filter(d => (d.userId === selectedUserId || d.userEmail === selectedUserId)) : docs;

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

function renderCharts(docs) {
    const filtered = selectedUserId ? docs.filter(d => (d.userId === selectedUserId || d.userEmail === selectedUserId)) : docs;

    // Re-using logic from dashboard.js with variations
    renderFocusChart(filtered);
    renderAppsChart(filtered);
}

function renderFocusChart(docs) {
    const canvas = document.getElementById('focusChart');
    if (!canvas) return;

    const hourlyData = {};
    docs.forEach(doc => {
        const hour = new Date(doc.$createdAt).getHours();
        const label = `${hour}:00`;
        hourlyData[label] = (hourlyData[label] || 0) + (doc.duration || 0);
    });

    const labels = Object.keys(hourlyData).sort();
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

    const appTotals = {};
    docs.forEach(doc => {
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
