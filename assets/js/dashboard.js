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

    try {
        await Promise.all([
            fetchFocusData(),
            fetchAppUsage(),
            fetchCoffeeCount(),
            fetchPresence(),
            fetchRecentActivity()
        ]);
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    }
};

// 1. Focus Time (Mocked for now as likely needs aggregation, but capable of DB fetch)
const fetchFocusData = async () => {
    // In a real scenario, you'd aggregate this from activity_logs or a separate 'daily_stats' collection
    // For now, we will retain the visualization logic but prepared for data
    const ctx = document.getElementById('focusChart').getContext('2d');

    // Example: Fetching last 5 'focus' entries if they existed
    // const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.equal('type', 'focus'), Query.limit(5)]);

    focusChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['09:00', '11:00', '13:00', '15:00', '17:00'],
            datasets: [{
                label: 'Focus Score',
                data: [10, 45, 30, 80, 65], // Helper: Replace with real data map
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
};

// 2. App Usage (Top Apps)
const fetchAppUsage = async () => {
    // Placeholder: Fetch top 5 apps by usage duration
    const ctx = document.getElementById('appsChart').getContext('2d');

    appsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['VS Code', 'Chrome', 'Slack', 'Terminal', 'Figma'],
            datasets: [{
                label: 'Usage (min)',
                data: [90, 75, 48, 30, 25],
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

            // Assume document has 'status' field
            statusEl.innerText = latest.status || "Unknown";
            statusEl.style.color = (latest.status === 'Present') ? '#f7d000' : '#888';

            const time = new Date(latest.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastSeenEl.innerText = `${time}`;

            // Mini Chart Data from last 5 entries
            const recentStatus = response.documents.slice(0, 5).reverse().map(d => d.status === 'Present' ? 1 : 0);
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
            // Mapping fields: assumes 'app_name', 'duration', 'status' exist
            const app = doc.app_name || "Unknown App";
            const duration = doc.duration ? `${doc.duration}m` : "-";
            const status = doc.status || "Active";

            return `
                <tr>
                    <td style="color: #fff; font-weight: 500;">${app}</td>
                    <td>${duration}</td>
                    <td style="color: ${status === 'Active' ? '#f7d000' : '#888'}">${status}</td>
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
