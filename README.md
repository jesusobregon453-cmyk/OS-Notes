# OS Notes Pro 🚀

> **The next-generation, privacy-first, cross-platform digital notebook with vector inking, audio-synced playback, and Google Drive cloud synchronization.**

![OS Notes](https://images.unsplash.com/photo-1517842645767-c639042777db?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features

- 🖋️ **Natural Vector Inking Engine**:
  - Fountain Pen, Ballpoint Pen, Calligraphy, Precision Pencil, and Semitransparent Highlighter.
  - Realistic Catmull-Rom spline smoothing and pressure-curve dynamics.
  - Smart geometric shape recognition (rectangles, triangles, circles, ellipses, diamonds, stars, arrows, lines).
- 🧹 **Advanced Eraser & Lasso**:
  - Standard pixel eraser, precision stroke eraser, and highlighter-only mode.
  - Freeform lasso selection tool with move, duplicate, export, and delete capabilities.
- 🎙️ **Audio-Synced Inking**:
  - Record audio while taking notes. Replay audio with synchronized ink replay timeline.
- 📐 **Templates & Themes**:
  - Blank, Squared/Grid, Ruled, Dotted, and Cornell note layouts.
  - White Paper, Dark Slate, Vintage Parchment, Blueprint, and Chalkboard themes.
- ☁️ **Google Drive™ Cloud Sync**:
  - Zero-knowledge bidirectional synchronization directly to your personal Google Drive.
  - Least-privilege security scope (`drive.file`): only accesses files created by OS Notes.
- 📂 **Multi-Document Management**:
  - Document library with cover colors, grid/list view, favorites, bookmarks, and search.
  - Page organizer sidebar (reorder, duplicate, add, delete, bookmark pages).
- 🔒 **100% Local-First & Private**:
  - All data is stored in your device's IndexedDB. Works completely offline.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm / pnpm / yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/os-notes.git
cd os-notes

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Google Drive Cloud Sync Setup (Production & Open Source)

OS Notes uses a **Zero-Knowledge Client-Side Architecture**. Your notes are sent directly from your browser to your Google Drive via Google's official OAuth 2.0 API.

### Option 1: Global Client ID (Recommended for Deployment)
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and set your Google OAuth Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```
3. Build and deploy to Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

### Option 2: Bring Your Own Credentials (BYOC in UI)
Users running a self-hosted instance or cloning the repository can simply click **"Conectar Drive"** in the app and paste their own Client ID right in the settings modal.

---

## 🛠️ Google Cloud Console Configuration

To allow users to sign in from your domain or local development:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `OS Notes`).
3. Enable **Google Drive API** in **APIs & Services > Library**.
4. Configure the **OAuth Consent Screen**:
   - User Type: **External**.
   - App Name: `OS Notes`.
   - Add scope: `https://www.googleapis.com/auth/drive.file`.
5. Go to **Credentials > Create Credentials > OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `https://your-domain.com` (for production)
6. Copy the generated **Client ID** into your `.env` or app settings.

---

## 📦 Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Storage**: IndexedDB (`idb` native wrapper)
- **Archive Engine**: JSZip
- **Auth & Cloud**: Google Identity Services (GIS) + Google Drive REST API v3

---

## 📄 License & Privacy

- Distributed under the [MIT License](LICENSE).
- Read our [Privacy Policy](PRIVACY.md).
