# Financial Tracker

A standalone, local-first personal finance tracker built with Vite, React, TypeScript, Tailwind CSS, SQLite via SQL.js, and a Tauri 2 desktop shell.

The app keeps ledger data locally in the browser/webview's IndexedDB by exporting the SQLite database after writes. React components use services and repository interfaces instead of calling SQLite directly.

## Scripts

```powershell
npm install
npm run dev
npm test
npm run build
npm run desktop:dev
npm run desktop:build
```

## GitHub Pages Deployment

This app can be hosted as a static GitHub Pages site. The Pages deployment only hosts the app code; ledger data remains local to each user's browser storage.

1. In the GitHub repository, open **Settings > Pages**.
2. Set **Build and deployment > Source** to **GitHub Actions**.
3. Push to `main`, or run the **Deploy GitHub Pages** workflow manually from the Actions tab.

The workflow in `.github/workflows/deploy-pages.yml` runs tests, builds the Vite app, uploads `dist/`, and deploys it to GitHub Pages.

## Desktop Prerequisites

Tauri desktop builds on Windows require Microsoft C++ Build Tools with MSVC and SDK components. If `npm run tauri -- info` reports that Visual Studio Build Tools are missing, install them before running `npm run desktop:dev` or `npm run desktop:build`.

## Current MVP

- Accounts, categories, and transactions can be created, edited, deleted, listed, and persisted locally.
- Default categories seed once on first launch.
- Account/category delete actions show clear errors when records are used by transactions.
- The dashboard derives balances, current-month income, expenses, net cashflow, top expense categories, and recent transactions from stored data.
- CSV export is available for all transactions and the current filtered transaction view.
- The local SQLite database can be downloaded as a backup file and restored from a backup file.
