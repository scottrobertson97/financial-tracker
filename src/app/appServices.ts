import { AccountService } from '../features/accounts/accountService';
import { BudgetService } from '../features/budgets/budgetService';
import { CategoryService } from '../features/categories/categoryService';
import { TransactionService } from '../features/transactions/transactionService';
import { createBrowserSqliteClient, type SqliteClient } from '../db/sqliteClient';
import { SqliteAccountRepository } from '../db/repositories/sqliteAccountRepository';
import { SqliteBudgetRepository } from '../db/repositories/sqliteBudgetRepository';
import { SqliteCategoryRepository } from '../db/repositories/sqliteCategoryRepository';
import { SqliteTransactionRepository } from '../db/repositories/sqliteTransactionRepository';
import {
  markStarterLedgerAsRestored,
  resetToEmptyLedger,
  resetToStarterLedger,
  seedDefaultCategories,
  seedStarterLedger,
} from '../db/seed';

export interface AppServices {
  accounts: AccountService;
  budgets: BudgetService;
  categories: CategoryService;
  exportDatabaseBackup: () => Uint8Array;
  resetToEmptyLedger: () => Promise<void>;
  resetToStarterLedger: () => Promise<void>;
  restoreDatabaseBackup: (data: Uint8Array) => Promise<void>;
  transactions: TransactionService;
  sqliteClient: SqliteClient;
}

export async function createAppServices(): Promise<AppServices> {
  const sqliteClient = await createBrowserSqliteClient();
  const accountRepository = new SqliteAccountRepository(sqliteClient);
  const budgetRepository = new SqliteBudgetRepository(sqliteClient);
  const categoryRepository = new SqliteCategoryRepository(sqliteClient);
  const transactionRepository = new SqliteTransactionRepository(sqliteClient);

  await seedStarterLedger({
    accountRepository,
    budgetRepository,
    categoryRepository,
    client: sqliteClient,
    transactionRepository,
  });

  return {
    accounts: new AccountService(accountRepository),
    budgets: new BudgetService(budgetRepository, categoryRepository),
    categories: new CategoryService(categoryRepository),
    exportDatabaseBackup: () => sqliteClient.export(),
    resetToEmptyLedger: () => resetToEmptyLedger(sqliteClient),
    resetToStarterLedger: () => resetToStarterLedger({
      accountRepository,
      budgetRepository,
      categoryRepository,
      client: sqliteClient,
      transactionRepository,
    }),
    restoreDatabaseBackup: async (data) => {
      await sqliteClient.replaceWith(data);
      await markStarterLedgerAsRestored(sqliteClient);
      await seedDefaultCategories(categoryRepository);
    },
    transactions: new TransactionService(transactionRepository),
    sqliteClient,
  };
}
