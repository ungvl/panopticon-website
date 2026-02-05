
class AppsModule {
    constructor(appwriteService) {
        this.db = appwriteService;
        this.chartInstance = null;
    }

    async init() {
        if (document.getElementById('appsChart')) {
            this.setupFilters();
            await this.render('24h');
        }
    }

    setupFilters() {
        const container = document.getElementById('apps-time-filters');
        if (!container) return;

        container.querySelectorAll('.filter-option').forEach(opt => {
            opt.addEventListener('click', () => {
                container.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.render(opt.dataset.range);
            });
        });
    }

    getDateFromRange(range) {
        const now = new Date();
        if (range === '24h') return new Date(now - 24 * 60 * 60 * 1000).toISOString();
        if (range === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        if (range === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        return new Date(now - 24 * 60 * 60 * 1000).toISOString(); // Default
    }

    async render(range = '24h') {
        const canvas = document.getElementById('appsChart');
        if (!canvas) return;

        try {
            const startTime = this.getDateFromRange(range);

            // Note: In a real app with many logs, aggregated queries are better.
            // Here we fetch limit(100) for demo relative to 'users' scale.
            // For production, this should likely map-reduce on server or fetch more.
            const response = await this.db.listDocuments(
                COLLECTIONS.ACTIVITY,
                [
                    this.db.Query.greaterThanEqual('$createdAt', startTime),
                    this.db.Query.limit(100)
                ]
            );

            const ctx = canvas.getContext('2d');
            let labels = [];
            let data = [];

            if (response.documents.length > 0) {
                const appTotals = {};
                response.documents.forEach(doc => {
                    const app = doc.app_used || "Unknown";
                    appTotals[app] = (appTotals[app] || 0) + (doc.duration || 0);
                });

                const sortedApps = Object.entries(appTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5); // Start with top 5

                if (sortedApps.length > 0) {
                    labels = sortedApps.map(a => a[0]);
                    data = sortedApps.map(a => Math.round(a[1] / 60)); // Minutes
                }
            } else {
                labels = ['No Data'];
                data = [0];
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
                        x: { grid: { display: false }, ticks: { color: '#888' } }
                    }
                }
            });
        } catch (err) {
            console.error("Apps Module Error:", err);
        }
    }
}
window.AppsModule = AppsModule;
