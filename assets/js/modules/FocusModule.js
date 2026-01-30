
class FocusModule {
    constructor(appwriteService) {
        this.db = appwriteService;
        this.chartInstance = null;
    }

    async init() {
        if (document.getElementById('focusChart')) {
            await this.render();
        }
    }

    async render() {
        const canvas = document.getElementById('focusChart');
        if (!canvas) return;

        try {
            const response = await this.db.listDocuments(
                COLLECTIONS.ACTIVITY,
                [
                    this.db.Query.orderDesc('$createdAt'),
                    this.db.Query.limit(50)
                ]
            );

            const ctx = canvas.getContext('2d');
            let labels = ['09:00', '11:00', '13:00', '15:00', '17:00'];
            let data = [10, 45, 30, 80, 65];

            if (response.documents.length > 0) {
                const hourlyData = {};
                response.documents.forEach(doc => {
                    const hour = new Date(doc.$createdAt).getHours();
                    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
                    hourlyData[timeLabel] = (hourlyData[timeLabel] || 0) + (doc.duration || 0);
                });

                const sortedHours = Object.keys(hourlyData).sort();
                if (sortedHours.length > 0) {
                    labels = sortedHours;
                    data = sortedHours.map(h => Math.round(hourlyData[h] / 60));
                }
            }

            if (this.chartInstance) this.chartInstance.destroy();

            this.chartInstance = new Chart(ctx, {
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
            console.error("Focus Module Error:", err);
        }
    }
}
