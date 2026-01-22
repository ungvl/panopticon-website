const { Client, Databases, Query } = Appwrite;

const PROJECT_ID = '68f0d9e300322bff44ec';
const DATABASE_ID = '68f15a2e00316a2ecc8d';
const COLLECTIONS = {
    ACTIVITY: 'activity_logs',
    COFFEE: 'coffee_logs',
    PRESENCE: 'presence_logs'
};

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(PROJECT_ID);

const databases = new Databases(client);

// Chart Instances
let focusChartInstance = null;
let appsChartInstance = null;
let presenceChartInstance = null;

const initDashboard = async () => {
    console.log("Initializing Dashboard with Real Data...");

    // Config for Chart.js (Dark Mode)
    Chart.defaults.color = '#888';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Run fetches individually to prevent one failure blocking others
    fetchFocusData().catch(e => console.error("Focus Data Error:", e));
    fetchAppUsage().catch(e => console.error("App Usage Error:", e));
    fetchCoffeeCount().catch(e => console.error("Coffee Count Error:", e));
    fetchPresence().catch(e => console.error("Presence Error:", e));
    fetchRecentActivity().catch(e => console.error("Recent Activity Error:", e));
};

// 1. Focus Time (Aggregated from activity_logs)
const fetchFocusData = async () => {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]
        );

        const ctx = document.getElementById('focusChart').getContext('2d');

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
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.limit(100)
            ]
        );

        const ctx = document.getElementById('appsChart').getContext('2d');

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
    try {
        // Fetch all coffee logs for "today"
        // Simply counting documents for now
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.COFFEE,
            [
                // Query.equal('date', 'today') // Requires correct date format in DB
                Query.limit(100)
            ]
        );
        document.getElementById('coffee-count').innerText = response.total;
    } catch (err) {
        console.warn("Could not fetch coffee logs:", err);
        document.getElementById('coffee-count').innerText = "0";
    }
};

// 4. Presence (Real Status)
const fetchPresence = async () => {
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
    const ctx = document.getElementById('presenceChart').getContext('2d');
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
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.orderDesc('$createdAt'),
                Query.limit(5)
            ]
        );

        const tbody = document.getElementById('activity-rows');

        if (response.documents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5;">No recent activity</td></tr>';
            return;
        }

        tbody.innerHTML = response.documents.map(doc => {
            // Mapping fields: assumes 'app_used', 'duration' exist
            const app = doc.app_used || "Unknown App";
            const duration = doc.duration ? `${Math.round(doc.duration / 60)}m` : "-";
            const status = "Active"; // If it's in activity_logs, it was active

            return `
                <tr>
                    <td style="color: #fff; font-weight: 500;">${app}</td>
                    <td>${duration}</td>
                    <td style="color: #f7d000">${status}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.warn("Could not fetch activity logs:", err);
    }
};

// Init on load
window.initDashboard = initDashboard;
if (document.readyState === 'complete') {
    // If loaded as standalone script or helper
}
