# Standalone Financial Tracker App — Codex Handoff

## Project Summary

Build a standalone, local-first personal finance tracker using web technologies that can later be exported/packageable as a desktop app. The app should let a single user record, edit, categorize, review, import, export, and back up their financial transactions.

The product should feel more like a private local ledger than a cloud budgeting platform. The MVP should prioritize trustworthy persistence, clean transaction workflows, and a simple review dashboard over bank sync or advanced automation.

## Product Thesis

The app is a calm, private financial cockpit:

> Track my money locally, understand where it went, and keep full ownership of my data.

## Core Principles

1. **Local-first**  
   User data should live locally, not in a remote service.

2. **User-owned data**  
   The user should be able to export transactions and back up the database.

3. **Boring, reliable ledger first**  
   Do not start with AI, Plaid, bank sync, forecasting, or complex budgeting.

4. **Readable architecture**  
   Keep domain logic, persistence, and UI separate.

5. **Integer money math**  
   Store currency values as integer cents. Do not use floating point numbers for persisted money values.

## Recommended Stack

Use the following stack unless the existing repository already has a different clear setup:

- **Frontend:** Vite + React + TypeScript
- **Styling:** Tailwind CSS
- **Desktop shell:** Tauri 2
- **Database:** SQLite
- **Validation:** Zod
- **Testing:** Vitest + React Testing Library

If Tauri setup blocks progress, scaffold the frontend first with a persistence abstraction and a mock/in-memory repository. The architecture should allow swapping the mock repository for SQLite later without rewriting UI components.

## MVP Scope

### In Scope

- Create accounts
- Create categories
- Add transactions manually
- Edit transactions
- Delete transactions
- View transaction list
- Filter/search transactions
- Dashboard summary totals
- CSV export
- SQLite persistence
- Basic seed data

### Defer Until After MVP

- Bank sync
- Plaid integration
- Login/auth
- Cloud sync
- Multi-user support
- Investments
- AI categorization
- Recurring transactions
- Receipt scanning
- Mobile app
- Complex forecasting

## Primary User Stories

### Account Management

As a user, I can create financial accounts so I can group transactions by source.

Examples:

- Checking
- Savings
- Credit card
- Cash

### Transaction Ledger

As a user, I can manually add transactions with date, account, description, amount, and category.

### Category Review

As a user, I can create and assign categories so I can understand my spending.

### Monthly Dashboard

As a user, I can see income, expenses, net cashflow, and account balances for the current month.

### Data Ownership

As a user, I can export my transactions as CSV so I am never locked into the app.

## Suggested App Structure

```txt
src/
  app/
    App.tsx
    routes/
      DashboardPage.tsx
      TransactionsPage.tsx
      AccountsPage.tsx
      CategoriesPage.tsx
      ImportExportPage.tsx
    layout/
      AppLayout.tsx
      Sidebar.tsx
  features/
    accounts/
      accountTypes.ts
      accountRepository.ts
      accountService.ts
      AccountForm.tsx
      AccountList.tsx
    categories/
      categoryTypes.ts
      categoryRepository.ts
      categoryService.ts
      CategoryForm.tsx
      CategoryList.tsx
    transactions/
      transactionTypes.ts
      transactionRepository.ts
      transactionService.ts
      TransactionForm.tsx
      TransactionList.tsx
      TransactionFilters.tsx
    dashboard/
      dashboardService.ts
      DashboardSummary.tsx
    importExport/
      csvExport.ts
      csvImport.ts
  db/
    sqliteClient.ts
    migrations/
      001_initial_schema.sql
    seed.ts
  shared/
    dates.ts
    ids.ts
    money.ts
    result.ts
    validation.ts
  test/
    fixtures.ts
```

## Domain Model

### Account

Represents a container of money.

```ts
export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  startingBalanceCents: number;
  createdAt: string;
  updatedAt: string;
}
```

### Category

Represents the meaning of a transaction.

```ts
export type CategoryType = 'income' | 'expense' | 'transfer';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Transaction

Represents a dated financial event.

```ts
export type TransactionStatus = 'pending' | 'cleared' | 'reconciled';

export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string | null;
  date: string;
  description: string;
  merchant?: string | null;
  amountCents: number;
  notes?: string | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}
```

Convention:

- Income should be stored as positive cents.
- Expenses should be stored as negative cents.
- Transfers can be modeled later. For MVP, allow category type `transfer` but do not build full double-entry transfer behavior yet.

## SQLite Schema

Create the initial migration at:

```txt
db/migrations/001_initial_schema.sql
```

Use this schema as the starting point:

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  starting_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  category_id TEXT,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT,
  amount_cents INTEGER NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'cleared',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY (transaction_id, tag),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
```

## Repository Interfaces

Do not call SQLite directly from React components. Use repository interfaces.

### Transaction Repository

```ts
export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string | null;
  date: string;
  description: string;
  merchant?: string | null;
  amountCents: number;
  notes?: string | null;
  status?: TransactionStatus;
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {}

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<Transaction>;
  update(id: string, input: UpdateTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Transaction | null>;
  list(filters?: TransactionFilters): Promise<Transaction[]>;
}
```

### Account Repository

```ts
export interface CreateAccountInput {
  name: string;
  type: AccountType;
  startingBalanceCents: number;
}

export interface AccountRepository {
  create(input: CreateAccountInput): Promise<Account>;
  update(id: string, input: Partial<CreateAccountInput>): Promise<Account>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Account | null>;
  list(): Promise<Account[]>;
}
```

### Category Repository

```ts
export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  color?: string | null;
}

export interface CategoryRepository {
  create(input: CreateCategoryInput): Promise<Category>;
  update(id: string, input: Partial<CreateCategoryInput>): Promise<Category>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Category | null>;
  list(): Promise<Category[]>;
}
```

## Shared Money Utilities

Create `src/shared/money.ts`.

Requirements:

- Convert user-entered dollar strings to cents.
- Format cents as display currency.
- Do not use float values for persisted values.
- Validate invalid input clearly.

Example API:

```ts
export function dollarsToCents(input: string): number {
  // "$12.34" -> 1234
  // "-12.34" -> -1234
  // reject invalid strings
}

export function centsToDollars(cents: number): string {
  // 1234 -> "12.34"
}

export function formatCurrency(cents: number): string {
  // 1234 -> "$12.34"
  // -1234 -> "-$12.34"
}
```

Add tests for these cases:

- `12` -> `1200`
- `12.3` -> `1230`
- `12.34` -> `1234`
- `0.99` -> `99`
- `-5.00` -> `-500`
- `$1,234.56` -> `123456`
- invalid strings should throw or return a validation error

## UI Requirements

Create a simple shell layout:

- Left sidebar
- Main content area
- Routes/pages for:
  - Dashboard
  - Transactions
  - Accounts
  - Categories
  - Import/Export

Do not over-polish. Keep UI simple and readable.

### Dashboard Page

Show four summary cards:

1. Total balance
2. Income this month
3. Expenses this month
4. Net cashflow this month

Also show:

- Top expense categories this month
- Recent transactions

### Transactions Page

Must include:

- Add transaction button/form
- Transaction table
- Search input
- Account filter
- Category filter
- Month/date filter

Columns:

- Date
- Description
- Merchant
- Account
- Category
- Amount
- Status
- Actions

### Transaction Form

Fields:

- Date
- Account
- Description
- Merchant optional
- Amount
- Category optional
- Status
- Notes optional

Validation:

- Date required
- Account required
- Description required
- Amount required and valid

### Accounts Page

User can:

- Add account
- Edit account
- Delete account only if no transactions exist for that account, or show a clear error

### Categories Page

User can:

- Add category
- Edit category
- Delete category only if no transactions use it, or show a clear error

### Import/Export Page

MVP export first.

User can:

- Export all transactions as CSV
- Export filtered transactions as CSV if filters already exist

CSV columns:

```txt
date,account,description,merchant,category,amount,status,notes
```

## Seed Data

On first app launch, seed default categories if none exist:

### Expense

- Rent
- Groceries
- Restaurants
- Transportation
- Utilities
- Subscriptions
- Shopping
- Healthcare
- Entertainment
- Miscellaneous

### Income

- Paycheck
- Bonus
- Interest
- Other Income

### Transfer

- Transfer

## Dashboard Calculations

### Total Balance

For each account:

```txt
starting_balance_cents + sum(transaction.amount_cents for account)
```

Total balance:

```txt
sum(account balances)
```

### Monthly Income

```txt
sum(amount_cents where amount_cents > 0 and transaction date is in selected month)
```

### Monthly Expenses

```txt
absolute value of sum(amount_cents where amount_cents < 0 and transaction date is in selected month)
```

### Net Cashflow

```txt
monthly income + monthly expenses_as_negative_amounts
```

## Implementation Plan

### Phase 1 — Scaffold

1. Create Vite React TypeScript project.
2. Add Tailwind.
3. Add basic route structure.
4. Add app shell with sidebar.
5. Add placeholder pages.

Acceptance criteria:

- App runs locally.
- Navigation between pages works.
- No persistence required yet.

### Phase 2 — Domain Types and Utilities

1. Add account, category, and transaction types.
2. Add money utilities.
3. Add date helpers.
4. Add ID helper.
5. Add tests for money utilities.

Acceptance criteria:

- Money utility tests pass.
- No React components use raw money parsing logic directly.

### Phase 3 — Persistence Layer

1. Add SQLite setup.
2. Add initial schema migration.
3. Add repository interfaces.
4. Add SQLite repository implementations.
5. Add seed categories.

Acceptance criteria:

- App initializes the local DB.
- Tables are created.
- Default categories seed once.
- Repository methods can create/list accounts, categories, and transactions.

### Phase 4 — Accounts and Categories UI

1. Build account form/list.
2. Build category form/list.
3. Wire to repositories/services.

Acceptance criteria:

- User can create accounts.
- User can create categories.
- Created records persist after reload.

### Phase 5 — Transactions UI

1. Build transaction form.
2. Build transaction table.
3. Add edit/delete actions.
4. Add search/filter basics.

Acceptance criteria:

- User can add a transaction.
- User can edit a transaction.
- User can delete a transaction.
- Transactions persist after reload.
- Amounts display correctly as currency.

### Phase 6 — Dashboard

1. Implement dashboard service.
2. Calculate account balances.
3. Calculate monthly income/expenses/net cashflow.
4. Show recent transactions.
5. Show top categories.

Acceptance criteria:

- Dashboard totals update when transactions change.
- Totals are derived from persisted data, not duplicated state.

### Phase 7 — CSV Export

1. Implement CSV serializer.
2. Add export button.
3. Generate downloadable CSV.

Acceptance criteria:

- Exported CSV contains all transactions.
- Currency values are exported in dollars, not raw cents.
- CSV escapes commas, quotes, and newlines correctly.

## Testing Expectations

Add tests where they protect important business logic.

Minimum tests:

- Money parsing/formatting
- Dashboard totals
- CSV escaping/export
- Repository create/list behavior if practical in the chosen setup

Avoid snapshot-heavy tests. Prefer behavior tests.

## Coding Standards

- Use TypeScript strict mode if possible.
- Prefer small, named functions.
- Keep React components mostly presentational.
- Keep calculations in services/helpers, not JSX.
- Do not duplicate derived values in DB unless necessary.
- Do not put SQL directly in page components.
- Do not use floats for persisted money.
- Use clear names over clever abstractions.
- Keep MVP boring and reliable.

## Important Guardrails for Codex

Before coding:

1. Inspect the current repository structure.
2. Identify whether this is a new project or an existing project.
3. Create a short implementation plan.
4. Prefer incremental commits/changes.
5. Run the available build/test commands after meaningful changes.

While coding:

1. Do not add bank sync.
2. Do not add auth.
3. Do not add cloud persistence.
4. Do not hardcode demo data as if it were real persisted data.
5. Do not let React components directly own database logic.
6. Do not overbuild charts before the ledger works.

When done:

1. Summarize what changed.
2. List commands run.
3. List any known gaps or follow-up tasks.
4. Mention any assumptions made.

## Suggested First Codex Task

Start with this narrower task:

> Initialize the project structure for a local-first finance tracker. Create a Vite React TypeScript app with Tailwind, a basic sidebar layout, placeholder pages for Dashboard, Transactions, Accounts, Categories, and Import/Export, plus shared domain types for Account, Category, and Transaction. Add money utilities with tests. Do not implement SQLite yet unless the project is already set up for Tauri.

This first task should produce a runnable skeleton without getting stuck on desktop packaging too early.

## Follow-Up Codex Task

After the skeleton works:

> Add SQLite persistence with an initial schema migration for accounts, categories, transactions, transaction_tags, and budgets. Create repository interfaces and SQLite-backed implementations for accounts, categories, and transactions. Seed default categories on first launch. Wire the Accounts and Categories pages to the persistence layer.

## Future Nice-to-Have Features

These should wait until after the MVP ledger is working:

- CSV import with column mapping
- Duplicate detection on import
- Import presets by bank/card
- Monthly review mode
- Budget envelopes
- Subscription detection
- Recurring transactions
- Local-only AI transaction cleanup
- Spending notes/journal per month
- Backup/restore database file UI
- Rule engine: merchant contains X -> category Y

## Definition of Done for MVP

The MVP is done when a user can:

1. Create an account.
2. Create or use default categories.
3. Add transactions.
4. Edit/delete transactions.
5. View transaction history.
6. See monthly dashboard totals.
7. Export transactions as CSV.
8. Close and reopen the app without losing data.

The app does not need bank sync, auth, or cloud features to be considered successful.
