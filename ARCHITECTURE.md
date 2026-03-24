# Technical Architecture of ITVisual

## 1. Visual Editor Native Engine
Instead of using heavy frameworks (React/Vue), ITVisual uses a **Vanilla JS State-Driven Engine**.
- **State Pattern**: All editor changes (blocks, colors, content) are synced with a central `state` object.
- **IFrame Isolation**: The code/site being edited is hosted in an `<iframe>`, allowing for accurate CSS styling without polluting the main editor's UI.
- **Micro-Animations**: Uses CSSTransitions and JS Animation loops for smooth transitions between editing modes.

## 2. Smart Persistence Layer
ITVisual combines the speed of browser memory with the reliability of persistent storage.
- **IndexedDB**: Large projects and uploaded assets are stored in **IndexedDB** using a wrapper. This allows for near-instant loading of large sites (up to 50MB+) without hitting `localStorage` quotas.
- **LocalStorage**: Used for quick state snapshots and session data.
- **Server Sync**: Seamless transition between local-only work and Cloudflare D1 database storage.

## 3. Advanced Backend Scraping
The **Spy/URL** feature is not a simple `fetch`.
- **Header Emulation**: The Cloudflare Worker backend emulates a full Google Chrome (v122+) environment, including `Sec-Ch-Ua`, `Sec-Fetch-*`, and `Accept-Language` headers. This is crucial for bypassing basic anti-bot systems like Keitaro.
- **CORS Proxy**: Enables cross-origin previews and asset fetching for the editor.

## 4. One-Click Export & CRM Logic
The export system doesn't just bundle files, it **injects business logic**.
- **PHP Injection**: During export, the system dynamically generates PHP handler scripts (`order.php`, `config.php`) pre-configured with the user's CRM keys.
- **JSZip Integration**: Bundles all assets into a ready-to-deploy `.zip` archive on the fly.

## 5. Modern Edge Infrastructure
- **Serverless Compute**: Powered by **Cloudflare Workers** (Pages Functions) for global, low-latency API responses.
- **Edge Database**: **Cloudflare D1** (SQLite) stores all user and project metadata directly at the edge of the network.
