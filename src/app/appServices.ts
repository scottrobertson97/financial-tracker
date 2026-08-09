import { AccountService } from '../features/accounts/accountService';
import { CategoryService } from '../features/categories/categoryService';
import { TransactionService } from '../features/transactions/transactionService';
import { createBrowserSqliteClient, type SqliteClient } from '../db/sqliteClient';
import { SqliteAccountRepository } from '../db/repositories/sqliteAccountRepository';
import { SqliteCategoryRepository } from '../db/repositories/sqliteCategoryRepository';
import { SqliteTransactionRepository } from '../db/repositories/sqliteTransactionRepository';
import {
  markStarterLedgerAsRestored,
  resetToStarterLedger,
  seedDefaultCategories,
  seedStarterLedger,
} from '../db/seed';

export interface AppServices {
  accounts: AccountService;
  categories: CategoryService;
  exportDatabaseBackup: () => Uint8Array;
  resetToStarterLedger: () => Promise<void>;
  restoreDatabaseBackup: (data: Uint8Array) => Promise<void>;
  transactions: TransactionService;
  sqliteClient: SqliteClient;
}

export async function createAppServices(): Promise<AppServices> {
  const sqliteClient = await createBrowserSqliteClient();
  const accountRepository = new SqliteAccountRepository(sqliteClient);
  const categoryRepository = new SqliteCategoryRepository(sqliteClient);
  const transactionRepository = new SqliteTransactionRepository(sqliteClient);

  await seedStarterLedger({
    accountRepository,
    categoryRepository,
    client: sqliteClient,
    transactionRepository,
  });

  return {
    accounts: new AccountService(accountRepository),
    categories: new CategoryService(categoryRepository),
    exportDatabaseBackup: () => sqliteClient.export(),
    resetToStarterLedger: () => resetToStarterLedger({
      accountRepository,
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
