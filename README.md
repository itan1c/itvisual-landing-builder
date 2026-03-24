# ITVisual — Landing Page Builder & SaaS Platform

**ITVisual** is a high-performance, developer-friendly landing page builder designed for rapid deployment and seamless CRM integration. Built on the Cloudflare ecosystem (Pages, Functions, D1), it offers an intuitive visual editing experience with a powerful backend for tracking and automation.

##  Key Features

- **Visual Site Editor**: Drag-and-drop-like experience for editing HTML sections, text, images, and styles in real-time.
- **Advanced Scraping (Spy/URL)**: Import existing landing pages by URL. The backend includes header emulators to bypass basic bot protections and trackers (e.g., Keitaro).
- **Pro Code Editor**: Integrated **CodeMirror** with syntax highlighting (HTML/CSS/JS/PHP), search, and fullscreen mode.
- **One-Click CRM Integration**: Built-in support for LP CRM, 7Leads, and SalesDrive. Generates ready-to-use PHP scripts for lead processing.
- **Smart Caching**: Uses **IndexedDB** for client-side persistence, ensuring work is saved even during network drops.
- **SEO Manager**: Integrated tool for managing meta tags, Open Graph, and search engine optimization.
- **Script/Pixel Manager**: Easily manage tracking pixels and external scripts in the document head.

## Tech Stack

- **Frontend**: Vanilla JS (ES6+), CSS3 (Modern Flex/Grid), Lucide Icons.
- **Backend**: Cloudflare Pages Functions (Edge Runtime).
- **Database**: Cloudflare D1 (SQLite on the Edge) & client-side IndexedDB.
- **State Management**: Reactive state pattern for the editor engine.
- **Libraries**: CodeMirror 5 (Editor), JSZip (Export), Lucide (Icons).

## Project Structure

- `admin.html` & `dashboard.html` — User and project management interfaces.
- `editor.html` — The core visual editing engine.
- `js/editor.js` — Main logic for the visual editor, DOM manipulation, and state.
- `functions/api/` — Serverless backend for auth, projects, and scraping.

## License

This project is licensed under the **GPL-3.0 License**. You are free to study and modify the code, but any derivative works must also be open-source. For commercial inquiries, please contact the author.
