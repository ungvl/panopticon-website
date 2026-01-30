
// Attention & Efficiency Logic

// Constants will be loaded from config.js, but we rely on a global or passed list
// We assume PRODUCTIVE_APPS is defined in config.js

const initAttention = () => {
    // Determine if we are on Dashboard or Admin and run accordingly
    if (document.getElementById('attentionChart')) {
        fetchAttentionData();
    }
};

// --- SHARED LOGIC ---

/**
 * Calculates efficiency score (0-100) based on productive apps
 * @param {Array} logs - List of activity documents
 * @returns {Object} { score: number, usefulTime: number, totalTime: number, topApp: string }
 */
const calculateEfficiencyMetrics = (logs) => {
    if (!logs || logs.length === 0) return { score: 0, usefulTime: 0, totalTime: 0, topApp: '-' };

    let usefulTime = 0;
    let totalTime = 0;
    const appDurations = {};

    logs.forEach(doc => {
        const app = doc.app_used || "Unknown";
        const duration = doc.duration || 0;

        totalTime += duration;

        // Check if app is productive (partial match to allow "VS Code - Project" etc)
        const isProductive = PRODUCTIVE_APPS.some(pApp => app.toLowerCase().includes(pApp.toLowerCase()));

        if (isProductive) {
            usefulTime += duration;
        }

        appDurations[app] = (appDurations[app] || 0) + duration;
    });

    const score = totalTime > 0 ? Math.round((usefulTime / totalTime) * 100) : 0;

    // Find top app
    const topApp = Object.entries(appDurations).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    return { score, usefulTime, totalTime, topApp };
};

// --- DASHBOARD (USER) LOGIC ---

const fetchAttentionData = async () => {
    const canvas = document.getElementById('attentionChart');
    const scoreEl = document.getElementById('attention-score-val');
    if (!canvas) return;

    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();

        // Fetch today's activity
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [
                Query.greaterThanEqual('$createdAt', startOfDay),
                Query.limit(100)
            ]
        );

        const metrics = calculateEfficiencyMetrics(response.documents);

        if (scoreEl) {
            scoreEl.innerText = `${metrics.score}%`;
        }

        // Render Gauge Chart
        renderAttentionChart(canvas, metrics.score);

    } catch (err) {
        console.error("Attention Fetch Error:", err);
    }
};

const renderAttentionChart = (canvas, score) => {
    // Semi-circle gauge
    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Productive', 'Distraction'],
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: ['#f7d000', 'rgba(255, 255, 255, 0.1)'],
                borderWidth: 0,
                cutout: '80%',
                circumference: 180,
                rotation: 270,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
};


// --- ADMIN LOGIC ---

/**
 * Renders the efficiency ranking table
 * @param {string} containerId - ID of tbody
 * @param {Array} allLogs - Activity logs for ALL users
 * @param {Object} userMap - Map of userId -> name
 */
const renderEfficiencyTable = (containerId, allLogs, userMap) => {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;

    // Group logs by user
    const userLogs = {};
    allLogs.forEach(doc => {
        const uid = doc.userId || doc.userEmail; // Fallback
        if (!uid) return;
        if (!userLogs[uid]) userLogs[uid] = [];
        userLogs[uid].push(doc);
    });

    // Calculate scores per user
    const rankings = Object.keys(userLogs).map(uid => {
        const metrics = calculateEfficiencyMetrics(userLogs[uid]);
        return {
            id: uid,
            name: userMap[uid] || uid,
            ...metrics
        };
    });

    // Sort by Score DESC
    rankings.sort((a, b) => b.score - a.score);

    // Render HTML
    tbody.innerHTML = rankings.map((r, index) => {
        const rank = index + 1;
        let rankColor = '#fff';
        if (rank === 1) rankColor = '#f7d000'; // Gold
        if (rank === 2) rankColor = '#c0c0c0'; // Silver
        if (rank === 3) rankColor = '#cd7f32'; // Bronze

        return `
            <tr>
                <td style="color: ${rankColor}; font-weight: bold;">#${rank}</td>
                <td>${r.name}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex-grow: 1; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${r.score}%; background: #f7d000; height: 100%;"></div>
                        </div>
                        <span style="min-width: 30px; text-align: right;">${r.score}%</span>
                    </div>
                </td>
                <td style="color: #888; font-size: 0.9em;">${r.topApp}</td>
            </tr>
        `;
    }).join('');
};

// Export for global usage
window.initAttention = initAttention;
window.renderEfficiencyTable = renderEfficiencyTable; // Explicit export for admin.js
