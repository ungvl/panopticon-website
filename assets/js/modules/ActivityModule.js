
class ActivityModule {
    constructor(appwriteService) {
        this.db = appwriteService;
    }

    async init() {
        if (document.getElementById('activity-rows')) {
            await this.fetchRecent();
        }
    }

    async fetchRecent() {
        const tbody = document.getElementById('activity-rows');
        if (!tbody) return;

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

            if (!response.documents || response.documents.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5;">No activity recorded today.</td></tr>';
                return;
            }

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

            const sortedApps = Object.values(appStats).sort((a, b) => b.totalSeconds - a.totalSeconds);

            tbody.innerHTML = sortedApps.map(stat => {
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
            tbody.innerHTML = `<tr><td colspan="3" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
        }

    }
}
window.ActivityModule = ActivityModule;
