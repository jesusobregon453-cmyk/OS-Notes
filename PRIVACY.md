# Privacy Policy for OS Notes

Last updated: October 2026

**OS Notes** is an open-source, privacy-first digital notebook and vector inking application. We believe your notes, thoughts, and documents belong strictly to you.

## 1. Zero-Knowledge Architecture
* **Local-First**: All your notebooks, ink strokes, audio recordings, and annotations are saved directly on your local device using browser IndexedDB.
* **No Telemetry or Tracking**: OS Notes contains no analytics, tracking pixels, or third-party advertising scripts.
* **No Proprietary Cloud Servers**: We do not host your data on any private database servers.

## 2. Google Drive™ Integration & Permissions
When you choose to connect your Google account to enable cloud backup and cross-device sync:
* **Scope Requested**: `https://www.googleapis.com/auth/drive.file`
* **What this means**: OS Notes requests access **ONLY** to the specific files and folders created or opened by OS Notes (inside the `OS Notes` folder in your personal Google Drive).
* **What we CANNOT access**: OS Notes has **zero access** to any of your other personal Google Drive documents, spreadsheets, photos, or emails.
* **Token Storage**: Your OAuth access tokens are stored securely in your local browser session and are never transmitted to any third party.

## 3. Data Retention and Deletion
* If you sign out of Google Drive, your local session is cleared immediately.
* If you delete a notebook inside OS Notes, you can choose to remove it both locally and from your Google Drive.
* You can revoke OS Notes' access to your Google account at any time via [Google Account Permissions](https://myaccount.google.com/permissions).

## 4. Open Source
The complete source code of OS Notes is publicly auditable on GitHub. You can review every line of code to verify how your data is handled.
