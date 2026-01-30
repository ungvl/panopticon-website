
// Wrapper for attention.js logic, but rewriting to fit OOP pattern better
class AttentionModule {
    constructor(appwriteService) {
        this.db = appwriteService;
    }

    async init() {
        if (document.getElementById('attentionChart')) {
            await this.fetchData();
        }
    }

    async fetchData() {
        // Reuse global helper if preferred, or reimplement
        // Reimplementing to use this.db instance
        const canvas = document.getElementById('attentionChart');
        const scoreEl = document.getElementById('attention-score-val');
        if (!canvas) return;

        try {
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();

            const response = await this.db.listDocuments(
                COLLECTIONS.ACTIVITY,
                [
                    this.db.Query.greaterThanEqual('$createdAt', startOfDay),
                    this.db.Query.limit(100)
                ]
            );

            // Use the global helper from attention.js if available, else implement locally
            // We'll rely on attention.js purely for Admin helpers now, and reimplement Dashboard logic here?
            // Actually, let's just implement the logic here cleanly.

            const metrics = this.calculateMetrics(response.documents);

            if (scoreEl) {
                scoreEl.innerText = `${metrics.score}%`;
            }

            this.renderChart(canvas, metrics.score);

        } catch (err) {
            console.error("Attention Module Error:", err);
        }
    }

    calculateMetrics(logs) {
        if (!logs || logs.length === 0) return { score: 0 };
        let usefulTime = 0;
        let totalTime = 0;

        logs.forEach(doc => {
            const app = doc.app_used || "Unknown";
            const duration = doc.duration || 0;
            totalTime += duration;
            const isProductive = PRODUCTIVE_APPS.some(pApp => app.toLowerCase().includes(pApp.toLowerCase()));
            if (isProductive) usefulTime += duration;
        });

        const score = totalTime > 0 ? Math.round((usefulTime / totalTime) * 100) : 0;
        return { score };
    }

    renderChart(canvas, score) {
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
                plugins: { legend: { display: false } },
                animation: { animateScale: true, animateRotate: true }
            }
        });
    }
}

// --- SHARED ADMIN LOGIC ---
const calculateEfficiencyMetrics = (logs) => {
    if (!logs || logs.length === 0) return { score: 0, usefulTime: 0, totalTime: 0, topApp: '-' };
    let usefulTime = 0;
    let totalTime = 0;
    const appDurations = {};

    logs.forEach(doc => {
        const app = doc.app_used || "Unknown";
        const duration = doc.duration || 0;
        totalTime += duration;
        const isProductive = PRODUCTIVE_APPS.some(pApp => app.toLowerCase().includes(pApp.toLowerCase()));
        if (isProductive) usefulTime += duration;
        appDurations[app] = (appDurations[app] || 0) + duration;
    });

    const score = totalTime > 0 ? Math.round((usefulTime / totalTime) * 100) : 0;
    const topApp = Object.entries(appDurations).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    return { score, usefulTime, totalTime, topApp };
};

const renderEfficiencyTable = (containerId, allLogs, userMap) => {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;

    const userLogs = {};
    allLogs.forEach(doc => {
        const uid = doc.userId || doc.userEmail;
        if (!uid) return;
        if (!userLogs[uid]) userLogs[uid] = [];
        userLogs[uid].push(doc);
    });

    const rankings = Object.keys(userLogs).map(uid => {
        const metrics = calculateEfficiencyMetrics(userLogs[uid]);
        return {
            id: uid,
            name: userMap[uid] || uid,
            ...metrics
        };
    });

    rankings.sort((a, b) => b.score - a.score);

    tbody.innerHTML = rankings.map((r, index) => {
        const rank = index + 1;
        let rankColor = '#fff';
        if (rank === 1) rankColor = '#f7d000';
        if (rank === 2) rankColor = '#c0c0c0';
        if (rank === 3) rankColor = '#cd7f32';

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

// Global Export for Legacy/Admin scripts
window.renderEfficiencyTable = renderEfficiencyTable;
