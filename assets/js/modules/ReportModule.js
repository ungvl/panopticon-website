
class ReportModule {
    constructor() {
        this.setupListener();
    }

    setupListener() {
        const btn = document.getElementById('export-user-report-btn');
        if (btn) {
            // Remove old listeners ideally, or just add new one (duplicates might be an issue if SPA, but this is MPA)
            btn.replaceWith(btn.cloneNode(true)); // Quick hack to clear listeners
            document.getElementById('export-user-report-btn').addEventListener('click', () => this.generate());
        }
    }

    generate() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const userNameEl = document.getElementById('user-name');
        const userName = userNameEl ? userNameEl.innerText : 'User';

        const printWindow = window.open('', '_blank');

        const focusCanvas = document.getElementById('focusChart');
        const appsCanvas = document.getElementById('appsChart');
        const attentionCanvas = document.getElementById('attentionChart');

        const focusImg = focusCanvas ? focusCanvas.toDataURL('image/png') : '';
        const appsImg = appsCanvas ? appsCanvas.toDataURL('image/png') : '';
        const attImg = attentionCanvas ? attentionCanvas.toDataURL('image/png') : '';

        const coffeeVal = document.getElementById('coffee-count')?.innerText || '0';
        const presenceVal = document.getElementById('presence-val')?.innerText || '-';
        const lastSeenVal = document.getElementById('last-seen')?.innerText || '-';
        const scoreVal = document.getElementById('attention-score-val')?.innerText || '-';
        const activityRowsVal = document.getElementById('activity-rows')?.innerHTML || '<tr><td>No Data</td></tr>';

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Panopticon User Report</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 2rem; color: #000; }
                    h1 { margin-bottom: 0.5rem; font-size: 24px; }
                    h2 { font-size: 14px; color: #666; margin-bottom: 2rem; font-weight: 400; }
                    .section-title { font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; font-size: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 12px; }
                    th { background: #f7d000; text-align: left; padding: 8px; border: 1px solid #000; }
                    td { padding: 8px; border: 1px solid #ddd; }
                    .chart-img { width: 100%; height: auto; border: 1px solid #eee; margin-bottom: 1rem; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
                    .stat-box { padding: 1rem; border: 1px solid #eee; border-radius: 8px; }
                    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
                    .stat-val { font-size: 24px; font-weight: 700; margin-top: 0.5rem; }
                </style>
            </head>
            <body>
                <h1>Personal Productivity Report</h1>
                <h2>User: ${userName}<br>Date: ${dateStr}</h2>

                <div class="stats-grid">
                    <div class="stat-box"><div class="stat-label">Productivity</div><div class="stat-val">${scoreVal}</div></div>
                    <div class="stat-box"><div class="stat-label">Coffee</div><div class="stat-val">${coffeeVal}</div></div>
                    <div class="stat-box"><div class="stat-label">Status</div><div class="stat-val">${presenceVal}</div></div>
                    <div class="stat-box"><div class="stat-label">Last Seen</div><div class="stat-val">${lastSeenVal}</div></div>
                </div>

                <div class="grid">
                    <div><div class="section-title">Focus Time</div><img src="${focusImg}" class="chart-img"></div>
                    <div><div class="section-title">App Usage</div><img src="${appsImg}" class="chart-img"></div>
                </div>
                 <div class="grid">
                    <div><div class="section-title">Attention</div><img src="${attImg}" class="chart-img" style="max-width: 200px;"></div>
                </div>

                <div class="section-title">Activity Log</div>
                <table>
                     <thead><tr><th>App</th><th>Duration</th><th>Status</th></tr></thead>
                    <tbody>${activityRowsVal}</tbody>
                </table>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;


        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
}

window.ReportModule = ReportModule;
