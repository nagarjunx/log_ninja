<div align="center">
  <br />
  <h1>🥷 LogNinja</h1>
  <p>
    <strong>High-Performance, Privacy-First Browser Log Analyzer</strong>
  </p>
  <p>
    Slice through your logs with Ninja precision.
  </p>
</div>

<br />

## 🌟 Overview

**LogNinja** is a premium, beautifully-designed client-side log file analyzer. Engineered to crunch millions of log lines entirely in your browser using Web Workers, LogNinja ensures your sensitive logs never leave your machine. Featuring a dark, modern "Shadow Ninja" aesthetic with vibrant data visualization, it makes debugging faster, easier, and much more fun.

---

## ✨ Features

- 🏎️ **Web-Worker Accelerated:** Multi-threaded parsing ensures the main UI stays buttery smooth even when importing massive log directories.
- 🔒 **100% Client-Side Private:** No backend, no trackers. Your logs stay exclusively inside your browser's local memory.
- 📊 **Rich Interactive Analytics:** Auto-generated time-series volume charts, error distribution pie charts, and anomaly detection.
- 🕵️ **Advanced Search:** Full regex support with blazing fast filtering to find the needle in the haystack.
- 🔍 **Automated Insights:** Instantly identifies error patterns, activity bursts, and config issues without manual searching.
- 📱 **Premium Responsive Design:** Stunning glassmorphism UI, a custom design system, and full-width layouts scaling beautifully up to 1920px ultra-wide displays.

## 🛠️ Tech Stack

- **Framework:** [React 18](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) for rapid utility classes combined with foundational CSS variables for a robust design system.
- **Charts:** [Recharts](https://recharts.org/)
- **Iconography:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

To run LogNinja locally on your machine, follow these simple steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nagarjunx/log_ninja.git
   cd log_ninja
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` to see LogNinja in action!

---

## 💡 How to Use

1. Click or drag-and-drop a log file (or entire folder) into the **Upload Zone** on the Landing Page.
2. Watch as LogNinja auto-detects formats and uses parallel Web Workers to parse the content.
3. Once parsing finishes, navigate through the Dashboard tabs:
   - **Overview:** General health, error rates, and volume charts.
   - **Timeline:** Detailed bar charts illustrating surges and drops in log activity.
   - **Errors:** Granular list of extracted standard errors.
   - **Patterns:** Intelligent grouping of similar log entries.
   - **Insights:** Automated AI-style heuristics detecting issues.
   - **Sources:** File-level breakdown of logs and faults.
   - **Search:** Deep-dive regex searching across everything.
   - **Raw Logs:** The unadulterated trace.

---

## 👨‍💻 Author

Built with 💖 by **Nagarjuna**

![LogNinja Dashboard Header Icons](https://img.shields.io/badge/Status-Active-success)
