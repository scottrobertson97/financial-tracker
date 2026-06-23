import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { SqliteAccountRepository } from './sqliteAccountRepository';
import { SqliteCategoryRepository } from './sqliteCategoryRepository';
import { SqliteTransactionRepository } from './sqliteTransactionRepository';
import { seedDefaultCategories, defaultCategories } from '../seed';
import { createSqliteClient, type SqliteClient } from '../sqliteClient';
import { createMemorySqliteStorage, type SqliteStorage } from '../sqliteStorage';

const sqlWasmPath = join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');

async function createRepositories(storage: SqliteStorage = createMemorySqliteStorage()) {
  const client = await createSqliteClient({ storage, locateFile: () => sqlWasmPath });

  return {
    accountRepository: new SqliteAccountRepository(client),
    categoryRepository: new SqliteCategoryRepository(client),
    client,
    storage,
    transactionRepository: new SqliteTransactionRepository(client),
  };
}

function closeClient(client: SqliteClient) {
  client.close();
}

describe('SQLite repositories', () => {
  it('creates, lists, and persists accounts across reloads', async () => {
    const storage = createMemorySqliteStorage();
    const firstSession = await createRepositories(storage);

    const account = await firstSession.accountRepository.create({
      name: 'Checking',
      type: 'checking',
      startingBalanceCents: 125000,
    });
    closeClient(firstSession.client);

    const secondSession = await createRepositories(storage);
    const accounts = await secondSession.accountRepository.list();

    expect(accounts).toEqual([
      expect.objectContaining({
        id: account.id,
        name: 'Checking',
        startingBalanceCents: 125000,
        type: 'checking',
      }),
    ]);

    closeClient(secondSession.client);
  });

  it('restores an exported SQLite database backup', async () => {
    const firstSession = await createRepositories();
    const account = await firstSession.accountRepository.create({
      name: 'Backup Checking',
      type: 'checking',
      startingBalanceCents: 90000,
    });
    const backup = firstSession.client.export();
    closeClient(firstSession.client);

    const secondSession = await createRepositories();
    await secondSession.accountRepository.create({
      name: 'Temporary Cash',
      type: 'cash',
      startingBalanceCents: 100,
    });

    await secondSession.client.replaceWith(backup);

    expect(await secondSession.accountRepository.list()).toEqual([
      expect.objectContaining({
        id: account.id,
        name: 'Backup Checking',
        startingBalanceCents: 90000,
      }),
    ]);

    closeClient(secondSession.client);
  });

  it('rejects invalid database backups without replacing the current database', async () => {
    const { accountRepository, client } = await createRepositories();
    await accountRepository.create({
      name: 'Still Here',
      type: 'checking',
      startingBalanceCents: 123,
    });

    await expect(client.replaceWith(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow('Invalid database backup');
    expect((await accountRepository.list()).map((account) => account.name)).toEqual(['Still Here']);

    closeClient(client);
  });

  it('seeds default categories once', async () => {
    const { categoryRepository, client } = await createRepositories();

    await seedDefaultCategories(categoryRepository);
    await seedDefaultCategories(categoryRepository);

    const categories = await categoryRepository.list();
    expect(categories).toHaveLength(defaultCategories.length);
    expect(categories.map((category) => category.name)).toContain('Groceries');
    expect(categories.map((category) => category.name)).toContain('Transfer');

    closeClient(client);
  });

  it('prevents deleting accounts or categories used by transactions', async () => {
    const { accountRepository, categoryRepository, client, transactionRepository } = await createRepositories();
    const account = await accountRepository.create({
      name: 'Cash',
      type: 'cash',
      startingBalanceCents: 0,
    });
    const category = await categoryRepository.create({
      name: 'Groceries',
      type: 'expense',
      color: '#15803d',
    });

    await transactionRepository.create({
      accountId: account.id,
      categoryId: category.id,
      date: '2026-06-23',
      description: 'Market run',
      amountCents: -4299,
      status: 'cleared',
    });

    await expect(accountRepository.delete(account.id)).rejects.toThrow('Cannot delete an account');
    await expect(categoryRepository.delete(category.id)).rejects.toThrow('Cannot delete a category');

    closeClient(client);
  });

  it('filters transactions by account, category, date, and search text', async () => {
    const { accountRepository, categoryRepository, client, transactionRepository } = await createRepositories();
    const checking = await accountRepository.create({
      name: 'Checking',
      type: 'checking',
      startingBalanceCents: 0,
    });
    const cash = await accountRepository.create({
      name: 'Cash',
      type: 'cash',
      startingBalanceCents: 0,
    });
    const groceries = await categoryRepository.create({
      name: 'Groceries',
      type: 'expense',
      color: '#15803d',
    });

    const expected = await transactionRepository.create({
      accountId: checking.id,
      categoryId: groceries.id,
      date: '2026-06-15',
      description: 'Farmers market',
      merchant: 'Saturday Market',
      amountCents: -3700,
      status: 'cleared',
    });
    await transactionRepository.create({
      accountId: cash.id,
      date: '2026-05-01',
      description: 'Coffee',
      amountCents: -450,
      status: 'cleared',
    });

    const filtered = await transactionRepository.list({
      accountId: checking.id,
      categoryId: groceries.id,
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      search: 'market',
    });

    expect(filtered).toEqual([expected]);

    closeClient(client);
  });
});
