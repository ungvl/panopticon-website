# Panopticon Website

A premium, data-driven dashboard and landing page for the Panopticon monitoring ecosystem. Featuring a striking black, white, and yellow aesthetic with a focus on high-performance data visualization.

## 🚀 Features

- **Appwrite Integration**: Fully powered by Appwrite Cloud for secure authentication, real-time database syncing, and user session management.
- **Collapsible Yellow Sidebar**: A sophisticated desktop navigation rail that maximizes screen real estate with a one-click collapse/expand mechanism.
- **Data-Rich Dashboard**: Integrated with **Chart.js** to display real-time focus trends, application usage, and presence statistics.
- **Specialized Detail Pages**:
    - **App Usage**: Deep dive into your active applications with historical logs.
    - **Focus Time**: Visual history of productive deep-work sessions.
    - **Coffee Tracker**: Health-focused monitor for caffeine consumption.
    - **Presence**: Real-time status monitoring.
- **Responsive "Liquid" Design**: Optimized for everything from ultrawide monitors (centered max-width constraints) to mobile phones (off-canvas drawer menu).

## 🛠️ Tech Stack

- **Auth & Backend**: [Appwrite Cloud](https://appwrite.io/) (SDK v16.1.0)
- **Visuals**: [Chart.js](https://www.chartjs.org/) for high-performance canvas rendering.
- **Styling**: Vanilla CSS3 with a custom utility-first design system, fluid typography, and hardware-accelerated transitions.
- **Logic**: ES6+ JavaScript (Async data fetching, event-driven UI).

## 📂 Project Structure

```text
panopticon-website/
├── assets/
│   ├── css/
│   │   └── styles.css      # Core Design System (v5)
│   ├── js/
│   │   ├── main.js         # Landing page & light auth logic
│   │   ├── dashboard.js    # Data fetching & Chart.js initialization
│   │   └── login.js        # Appwrite auth flows
├── pages/
│   ├── dashboard.html      # Central data hub
│   ├── apps.html           # Application usage metrics
│   ├── focus.html          # Productivity analysis
│   ├── coffee.html         # Health tracking
│   ├── presence.html       # Status monitoring
│   └── login.html          # Secure entry point
└── index.html              # Marketing & Guest entry
```

## 🏁 Getting Started

To run this project locally:

1.  Clone the repository.
2.  Serve the directory using a web server (essential for Appwrite SDK and module imports):
    ```bash
    # Example using Python
    python -m http.server 8080
    ```
3.  Navigate to `http://localhost:8080` in your browser.

---
*© 2026 Panopticon Project | Built for High-Performance Monitoring*