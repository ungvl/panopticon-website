// User Directory - Logic loaded dynamically by dashboard.js

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

        // Setup Realtime Subscription
        client.subscribe([
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.ACTIVITY}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.PRESENCE}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.USERS}.documents`
        ], response => {
            fetchAndRenderUsers();
        });
    } catch (err) {
        console.error("Users Init Error:", err);
        if (err.code === 401) window.location.href = 'login.html';
    }
}

async function fetchAndRenderUsers() {
    const grid = document.getElementById('user-grid');

    try {
        // 1. Fetch data for aggregation
        const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(100)]);
        const activityResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.limit(100)]);
        const presenceResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PRESENCE, [Query.limit(100), Query.orderDesc('$createdAt')]);

        // 2. Aggregate Data per User
        const userMap = {};

        // Initialize from Users Collection
        usersResponse.documents.forEach(doc => {
            const uid = doc.$id;
            userMap[uid] = {
                id: uid,
                name: doc.name || "Unknown Member",
                email: doc.email || "",
                totalFocus: 0,
                lastSeen: null,
                isOnline: false
            };
        });

        // Process Activity
        activityResponse.documents.forEach(doc => {
            const uid = doc.userId || doc.userEmail || (doc.users && doc.users.$id) || "Unknown";
            const name = doc.name || (doc.users && doc.users.name) || (uid.includes('@') ? uid.split('@')[0] : uid);

            if (!userMap[uid]) {
                userMap[uid] = { id: uid, name: name, email: uid, totalFocus: 0, lastSeen: null, isOnline: false };
            }
            userMap[uid].totalFocus += (doc.duration || 0);
        });

        // Process Presence
        const now = new Date();
        presenceResponse.documents.forEach(doc => {
            const uid = doc.userId || doc.userEmail || (doc.users && doc.users.$id) || "Unknown";
            const name = doc.name || (doc.users && doc.users.name) || (uid.includes('@') ? uid.split('@')[0] : uid);

            if (!userMap[uid]) {
                userMap[uid] = { id: uid, name: name, email: uid, totalFocus: 0, lastSeen: null, isOnline: false };
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
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; opacity: 0.5;">No users found.</div>';
            return;
        }

        grid.innerHTML = userList.map(user => `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-info">
                        <span class="user-name">${user.name.toUpperCase()}</span>
                        <span class="user-email">${user.email || user.id}</span>
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

// Global functions
window.initUsers = initUsers;
