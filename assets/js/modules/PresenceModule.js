
class PresenceModule {
    constructor(appwriteService) {
        this.db = appwriteService;
        this.chartInstance = null;
    }

    async init() {
        if (document.getElementById('presence-val') || document.getElementById('presenceChart')) {
            await this.fetchPresence();
        }
    }

    async fetchPresence() {
        try {
            const response = await this.db.listDocuments(
                COLLECTIONS.PRESENCE,
                [
                    this.db.Query.orderDesc('$createdAt'),
                    this.db.Query.limit(10)
                ]
            );

            if (response.documents.length > 0) {
                const latest = response.documents[0];
                const statusEl = document.getElementById('presence-val');
                const lastSeenEl = document.getElementById('last-seen');

                const lastSeenDate = new Date(latest.$createdAt);
                const now = new Date();
                const diffMinutes = (now - lastSeenDate) / (1000 * 60);
                const isPresent = diffMinutes < 5;

                if (statusEl) {
                    statusEl.innerText = isPresent ? "Present" : "Away";
                    statusEl.style.color = isPresent ? '#f7d000' : '#888';
                }

                if (lastSeenEl) {
                    const time = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    lastSeenEl.innerText = `${time}`;
                }

                const recentStatus = response.documents.slice(0, 5).reverse();
                const chartData = recentStatus.map(d => 1);
                const chartLabels = recentStatus.map(d => new Date(d.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

                this.renderMiniChart(chartData, chartLabels);
            }
        } catch (err) {
            this.renderMiniChart([0, 0, 0, 0, 0], ['-', '-', '-', '-', '-']);
        }
    }

    renderMiniChart(data, labels) {
        const canvas = document.getElementById('presenceChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: '#f7d000',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#f7d000',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false, min: 0, max: 2 },
                    x: { ticks: { color: '#666', font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }
}
window.PresenceModule = PresenceModule;
