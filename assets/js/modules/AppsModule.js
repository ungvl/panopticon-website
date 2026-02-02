
class AppsModule {
    constructor(appwriteService) {
        this.db = appwriteService;
        this.chartInstance = null;
    }

    async init() {
        if (document.getElementById('appsChart')) {
            await this.render();
        }
    }

    async render() {
        const canvas = document.getElementById('appsChart');
        if (!canvas) return;

        try {
            const response = await this.db.listDocuments(
                COLLECTIONS.ACTIVITY,
                [this.db.Query.limit(100)]
            );

            const ctx = canvas.getContext('2d');
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
                    data = sortedApps.map(a => Math.round(a[1] / 60));
                }
            }

            if (this.chartInstance) this.chartInstance.destroy();

            this.chartInstance = new Chart(ctx, {
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
            console.error("Apps Module Error:", err);
        }

    }
}
window.AppsModule = AppsModule;
