# Panopticon Website

A sleek, minimalistic landing page for the Panopticon local monitoring system. Designed with a premium black, white, and yellow aesthetic.

## 🚀 Features

- **Dynamic Landing Page**: Adaptive UI that switches between Guest and Authenticated views.
- **Cookie-Based Authentication**: Client-side session management using cookies for persistent states.
- **Responsive & Scalable**: Fully fluid design using modern CSS (`clamp()`, Flexbox) that looks great on mobile, tablet, and desktop.
- **Cross-Browser Optimized**: Specifically tuned for Chrome, Brave, Edge, and Firefox (fixed scaling and link color issues).
- **Minimalistic UI**: Focused hero area with high-impact typography and clear call-to-actions.

## 🛠️ Tech Stack

- **Structure**: Semantic HTML5
- **Styling**: Vanilla CSS3 (Custom properties, fluid typography)
- **Logic**: Vanilla JavaScript (Async cookie handling, DOM manipulation)

## 📂 Project Structure

```text
panopticon-website/
├── assets/
│   ├── css/
│   │   └── styles.css      # Core design system and responsive layout
│   ├── js/
│   │   ├── main.js         # Auth logic and UI toggling
│   │   └── login.js        # Form handling and cookie setting
│   └── images/             # Brand assets (SVG)
├── pages/
│   └── login.html          # Centered login experience
└── index.html              # Main landing page entry point
```

## 🏁 Getting Started

Since this is a static website, you can view it by simply opening `index.html` in any modern web browser.

> [!NOTE]
> For the best experience with cookie persistence and script loading, it is recommended to serve the files using a local web server (like VS Code Live Server or `npx serve`).

---
*© 2026 Panopticon Project*