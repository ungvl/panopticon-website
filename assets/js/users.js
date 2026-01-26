const { Client, Databases, Query, Account } = Appwrite;

const PROJECT_ID = '68f0d9e300322bff44ec';
const DATABASE_ID = '68f15a2e00316a2ecc8d';
const ENDPOINT = 'https://cloud.appwrite.io/v1';

const COLLECTIONS = {
    ACTIVITY: 'activity_logs',
    PRESENCE: 'presence_logs'
};

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const databases = new Databases(client);
const account = new Account(client);

async function initUsers() {
    try {
        const user = await account.get();
        const isAdmin = user.labels && user.labels.includes('admin');

        if (!isAdmin) {
            window.location.href = 'dashboard.html';
            return;
        }

        document.getElementById('user-name').innerText = user.name || user.email;

        await fetchAndRenderUsers();
        setInterval(fetchAndRenderUsers, 60000); // Refresh every minute
    } catch (err) {
        console.error("Auth Error:", err);
        window.location.href = 'login.html';
    }
}

async function fetchAndRenderUsers() {
    console.log("Fetching directory data...");
    const grid = document.getElementById('user-grid');

    try {
        // 1. Fetch data for aggregation
        const activityResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.limit(100)]);
        const presenceResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRESENCE, [Query.limit(100), Query.orderDesc('$createdAt')]);

        // 2. Aggregate Data per User
        const userMap = {};

        // Process Activity
        activityResponse.documents.forEach(doc => {
            const uid = doc.userId || doc.userEmail || "Unknown";
            if (!userMap[uid]) {
                userMap[uid] = { id: uid, totalFocus: 0, lastSeen: null, isOnline: false };
            }
            userMap[uid].totalFocus += (doc.duration || 0);
        });

        // Process Presence
        const now = new Date();
        presenceResponse.documents.forEach(doc => {
            const uid = doc.userId || doc.userEmail || "Unknown";
            if (!userMap[uid]) {
                userMap[uid] = { id: uid, totalFocus: 0, lastSeen: null, isOnline: false };
            }

            const docDate = new Date(doc.$createdAt);
            if (!userMap[uid].lastSeen || docDate > userMap[uid].lastSeen) {
                userMap[uid].lastSeen = docDate;
                // Online if seen in last 5 minutes
                const diff = (now - docDate) / (1000 * 60);
                if (diff < 5) userMap[uid].isOnline = true;
            }
        });

        // 3. Render
        const userList = Object.values(userMap);
        if (userList.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; opacity: 0.5;">No users found with activity.</div>';
            return;
        }

        grid.innerHTML = userList.map(user => `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-info">
                        <span class="user-name">${user.id.split('@')[0].toUpperCase()}</span>
                        <span class="user-email">${user.id.includes('@') ? user.id : 'Internal ID: ' + user.id}</span>
                    </div>
                    <span class="status-badge ${user.isOnline ? 'status-online' : 'status-offline'}">
                        ${user.isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
                
                <div class="user-stats">
                    <div class="stat-item">
                        <span class="stat-label">Last Active</span>
                        <span class="stat-value">${user.lastSeen ? formatTime(user.lastSeen) : 'N/A'}</span>
                    </div>
                    <div class="stat-item" style="margin-left: auto;">
                        <span class="stat-label">Total Focus</span>
                        <span class="stat-value">${Math.round(user.totalFocus / 60)}h ${Math.round(user.totalFocus % 60)}m</span>
                    </div>
                </div>

                <a href="admin.html?u=${encodeURIComponent(user.id)}" class="view-btn">
                    View Live Dashboard
                </a>
            </div>
        `).join('');

    } catch (err) {
        console.error("Directory Fetch Error:", err);
        grid.innerHTML = `<div style="grid-column: 1/-1; color: #ff4444; text-align: center;">Error loading directory: ${err.message}</div>`;
    }
}

function formatTime(date) {
    const now = new Date();
    const diff = (now - date) / (1000 * 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return Math.floor(diff) + 'm ago';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Basic Sidebar functionality
document.addEventListener('DOMContentLoaded', () => {
    initUsers();

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
