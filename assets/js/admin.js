const { Client, Databases, Query, Account } = Appwrite;

const PROJECT_ID = '68f0d9e300322bff44ec';
const DATABASE_ID = '68f15a2e00316a2ecc8d';
const ENDPOINT = 'https://cloud.appwrite.io/v1';

const COLLECTIONS = {
    ACTIVITY: 'activity_logs',
    COFFEE: 'coffee_logs',
    PRESENCE: 'presence_logs'
};

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const databases = new Databases(client);
const account = new Account(client);

let selectedUserId = null; // null means "All Users"
let activeUsers = [];
let charts = { focus: null, apps: null };

async function initAdmin() {
    try {
        const user = await account.get();
        const isAdmin = user.labels && user.labels.includes('admin');

        if (!isAdmin) {
            console.warn("Unauthorized access attempt to admin view");
            window.location.href = 'dashboard.html';
            return;
        }

        document.getElementById('user-name').innerText = user.name || user.email;

        // Handle URL Parameter for User Selection
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('u');
        if (userParam) {
            selectedUserId = userParam;
            console.log("Pre-selecting user from URL:", selectedUserId);
        }

        // Initial Fetch
        await refreshAdminData();

        // Setup Auto-refresh
        setInterval(refreshAdminData, 30000); // 30s
    } catch (err) {
        console.error("Admin Auth Error:", err);
        window.location.href = 'login.html';
    }
}

async function refreshAdminData() {
    console.log("Refreshing Admin Data...");

    // 1. Fetch all data to determine users and global stats
    const activityResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.limit(100), Query.orderDesc('$createdAt')]);
    const coffeeResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.COFFEE, [Query.limit(100)]);
    const presenceResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRESENCE, [Query.limit(100)]);

    // 2. Extract unique users based on common fields (userId preferred, fall back to email if logged)
    const users = new Set();
    activityResponse.documents.forEach(doc => {
        const uid = doc.userId || doc.userEmail || "Unknown";
        users.add(uid);
    });

    activeUsers = Array.from(users);
    renderUserList(activeUsers);

    updateHeaderStats(activityResponse.documents, coffeeResponse.documents, activeUsers.length);
    renderActivityTable(activityResponse.documents);
    renderCharts(activityResponse.documents);
}

function renderUserList(users) {
    const listEl = document.getElementById('user-list');
    const allUsersPill = `<div class="user-pill" onclick="window.location.href='users.html'" style="border-style: dashed; opacity: 0.8;">← User Directory</div>`;

    const userPills = users.map(u => `
        <div class="user-pill ${selectedUserId === u ? 'active' : ''}" onclick="selectUser('${u}')">
            ${u.length > 20 ? u.substring(0, 15) + '...' : u}
        </div>
    `).join('');

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

// Sidebar logic
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();

    const collapseBtn = document.getElementById('collapse-btn');
    const sidebar = document.getElementById('sidebar');
    if (sidebar && collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await account.deleteSession('current');
            window.location.href = '../index.html';
        });
    }
});

// Polyfill for pixel calculation (internal use for browser tool verification)
window.selectUser = selectUser;
