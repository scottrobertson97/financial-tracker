# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 💡 High-Level Architecture Overview

The financial tracker is structured as a multi-platform application utilizing **React** for the user interface and **Tauri** for packaging into desktop environments. The codebase adheres to a modular, feature-driven architecture:

1.  **Client/UI (`src/`):**
    *   This directory houses the core frontend logic, built using React and managed by Vite.
    *   Features are organized into self-contained directories (e.g., `src/features/dashboard`, `src/features/importExport`). This promotes component isolation and focused development.
2.  **Domain & Utilities (`src/shared/`):**
    *   Global utility functions and foundational types live here, ensuring consistency across features. Examples include currency handling (e.g., `money.ts`) and core validation logic.
3.  **Data Access Layer (`src/db/repositories/`):**
    *   This layer encapsulates all database interactions (e.g., `sqliteRepositories`). Direct interaction with the database should occur through these repository classes to maintain clean separation of concerns.
4.  **Platform & State Management:**
    *   The application uses explicit type definitions (`Account`, `Transaction`, `Category`) across modules, suggesting a strong reliance on TypeScript and predictable data flow.
    *   Desktop capabilities are handled via the `@tauri-apps/api` integration, making this part of the codebase specific to native OS interactions.

## 🚀 Common Development Commands

The primary development workflow revolves around standard Node.js tooling orchestrated by `package.json`.

| Task | Command (npm run) | Description | Details |
| :--- | :--- | :--- | :--- |
| **Start Dev Server** | `dev` | Runs the Vite development server, enabling hot-reloading for rapid UI iteration. | Ideal for frontend work and viewing live changes in browser emulation. |
| **Build Application** | `build` | Compiles TypeScript (`tsc -b`) and bundles the entire application (`vite build`). | This generates production assets needed for deployment or distribution. |
| **Run Tests (Single)** | `test` | Runs the full suite of unit tests using Vitest. | Use this when a feature set requires comprehensive testing. |
| **Test Watch Mode** | `test:watch` | Starts Vitest in watch mode, re-running tests automatically on file changes. | Recommended during development to maintain high test coverage continuously. |
| **Desktop Dev** | `desktop:dev` / `tauri dev` | Launches the application with Tauri, simulating a native desktop environment. | Use this when developing platform-specific code or testing OS interactions. |

### 🧪 Testing Focus
*   Tests are unit-based (e.g., `src/shared/validation.test.ts`).
*   The testing setup is configured via `./src/test/setup.ts` and uses `jsdom` for environment simulation, making it suitable for component and logic testing within a browser context.

## 🧱 Key Modules & Files to Know

*   **Data Serialization:** The `csvExport.ts` module demonstrates the pattern for transforming complex domain objects (like an array of `Transaction`) into structured data formats suitable for file export. Pay attention to helper functions like `escapeCsvValue`.
*   **Configuration:**
    *   `vite.config.ts`: Defines the frontend build pipeline, including test environment setup (`jsdom`).
    *   `package.json`: Source of truth for all available scripts and dependencies.
    *   `tsconfig.*.json`: Used to manage TypeScript compilation targets and module resolution across different parts of the app (e.g., `tsconfig.node.json` for backend/build logic).

## 🛡️ Development Best Practices

1.  **New Feature Implementation:** When adding new logic, prioritize placing it in the relevant feature directory (e.g., `src/features/...`) and define clear type contracts using the existing domain models (`Account`, `Transaction`).
2.  **Modularity:** New utilities should be placed in `src/shared/` if they are universally applicable, or within a dedicated feature folder if scope is limited.
3.  **State Management:** Be mindful of which module owns data state; do not replicate core business logic outside the structured domain modules to prevent inconsistencies.