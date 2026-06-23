# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Project Shape

This is a standalone, local-first personal finance tracker.

- Frontend: Vite, React, TypeScript
- Styling: Tailwind CSS
- Persistence: SQLite via `sql.js`, saved locally to IndexedDB
- Desktop shell: Tauri 2 under `src-tauri/`
- Validation: Zod
- Tests: Vitest
- Static deployment: GitHub Pages via `.github/workflows/deploy-pages.yml`

The app should feel like a private local ledger, not a cloud budgeting service. Do not add bank sync, Plaid, login/auth, cloud sync, AI categorization, mobile features, or forecasting unless the user explicitly asks.

## Architecture Rules

- React pages and components must not call SQLite directly.
- Use services and repository interfaces for app data access.
- Keep persistence code under `src/db/`.
- Keep domain feature code under `src/features/`.
- Keep shared helpers under `src/shared/`.
- Store persisted money values as integer cents only.
- Do not use floating-point values for persisted money.
- Keep derived values, such as dashboard totals, in services/helpers rather than duplicating them in the database.

Important paths:

- `src/app/routes/` - top-level pages
- `src/app/layout/` - app shell and sidebar
- `src/app/appServices.ts` - app service composition
- `src/db/sqliteClient.ts` - SQL.js client wrapper
- `src/db/repositories/` - SQLite repository implementations
- `db/migrations/001_initial_schema.sql` - initial SQLite schema
- `src/features/dashboard/dashboardService.ts` - dashboard calculations
- `src/features/importExport/csvExport.ts` - CSV export logic

## Persistence Notes

The browser app exports the SQL.js database after writes and saves it to IndexedDB. The Import/Export page also supports:

- CSV export for transactions
- CSV export for the current filtered transaction view
- SQLite database backup download
- SQLite database restore

When changing persistence behavior, verify that reload persistence still works and that repository tests cover the important path.

## Routing And Deployment

The app uses `HashRouter` intentionally so GitHub Pages and static desktop builds do not require server-side route fallback.

`vite.config.ts` uses `base: './'` so built assets work under GitHub Pages repository URLs.

GitHub Pages deploys through `.github/workflows/deploy-pages.yml`. The workflow runs:

```powershell
npm ci
npm test
npm run build
```

Then it uploads `dist/` as a Pages artifact.

## Tauri Notes

Tauri project files live under `src-tauri/`.

Useful commands:

```powershell
npm run tauri -- info
npm run desktop:dev
npm run desktop:build
```

On Windows, native Tauri builds require Visual Studio C++ Build Tools with MSVC and Windows SDK components. If `link.exe` or `kernel32.lib` cannot be found, fix the local Visual Studio developer environment before treating Rust/Tauri compile failures as app code failures.

## Commands To Run

For ordinary frontend or domain changes:

```powershell
npm test
npm run build
npm audit --audit-level=moderate
```

For GitHub Pages deployment changes, also inspect `dist/index.html` after build and confirm asset paths are relative, such as `./assets/...`.

For desktop changes, run:

```powershell
npm run tauri -- info
cargo check --manifest-path src-tauri/Cargo.toml
```

Only run full `npm run desktop:build` when the local Windows native toolchain is available.

## UI Guidance

Keep the UI calm, readable, and work-focused:

- Sidebar plus main content area
- Dense but clear tables and forms
- No marketing landing page
- No chart-heavy polish before ledger workflows are correct
- Clear validation and delete-guard messages

Preserve these MVP surfaces:

- Dashboard
- Transactions
- Accounts
- Categories
- Import/Export

## Testing Expectations

Prefer behavior tests over snapshots.

Minimum important coverage:

- Money parsing and formatting
- Validation helpers
- SQLite repository create/list/filter behavior
- Database backup/restore
- Dashboard totals
- CSV escaping/export

If changing money parsing, dashboard math, CSV generation, repository behavior, persistence, or backup/restore, add or update tests in the same slice.

## Guardrails

- Do not introduce remote services for normal ledger data.
- Do not hardcode demo data as if it were persisted user data.
- Do not add SQL to page components.
- Do not remove the SQLite migration unless replacing it with a compatible migration path.
- Do not change the sign convention: income is positive cents, expenses are negative cents.
- Transfers can use category type `transfer`, but full double-entry transfer behavior is not part of the current MVP.
