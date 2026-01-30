
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

                const recentStatus = response.documents.slice(0, 5).reverse().map(d => 1);
                this.renderMiniChart(recentStatus);
            }
        } catch (err) {
            this.renderMiniChart([0, 0, 0, 0, 0]);
        }
    }

    renderMiniChart(data) {
        const canvas = document.getElementById('presenceChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chartInstance) this.chartInstance.destroy();

        this.chartInstance = new Chart(ctx, {
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
    }
}
