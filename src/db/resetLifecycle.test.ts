import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BudgetRepository } from '../features/budgets/budgetRepository';
import { SqliteAccountRepository } from './repositories/sqliteAccountRepository';
import { SqliteBudgetRepository } from './repositories/sqliteBudgetRepository';
import { SqliteCategoryRepository } from './repositories/sqliteCategoryRepository';
import { SqliteTransactionRepository } from './repositories/sqliteTransactionRepository';
import { resetToEmptyLedger, resetToStarterLedger, seedStarterLedger } from './seed';
import { createSqliteClient, type SqliteClient } from './sqliteClient';
import { createMemorySqliteStorage, type SqliteStorage } from './sqliteStorage';

const sqlWasmPath = join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');

describe('ledger reset lifecycle', () => {
  it('rolls back deletion and partial reseeding when starter seeding fails', async () => {
    const repositories = await createRepositories();
    const original = await createOriginalLedger(repositories);
    const realBudgetRepository = repositories.budgetRepository;
    const failingBudgetRepository: BudgetRepository = {
      delete: (categoryId, month) => realBudgetRepository.delete(categoryId, month),
      getByCategoryAndMonth: (categoryId, month) => realBudgetRepository.getByCategoryAndMonth(categoryId, month),
      listByMonth: (month) => realBudgetRepository.listByMonth(month),
      upsert: async () => {
        throw new Error('Starter budget seed failed.');
      },
    };

    await expect(resetToStarterLedger({
      ...repositories,
      budgetRepository: failingBudgetRepository,
      referenceDate: new Date(2026, 7, 9),
    })).rejects.toThrow('Starter budget seed failed.');

    await expectOriginalLedger(repositories, original);
    repositories.client.close();
  });

  it('recovers the prior in-memory and persisted ledger when reset persistence fails', async () => {
    const storage = createFailOnceStorage();
    const repositories = await createRepositories(storage);
    const original = await createOriginalLedger(repositories);
    storage.failNextSave();

    await expect(resetToStarterLedger({
      ...repositories,
      referenceDate: new Date(2026, 7, 9),
    })).rejects.toThrow('Simulated persistence failure.');

    await expectOriginalLedger(repositories, original);
    repositories.client.close();

    const reloaded = await createRepositories(storage);
    await expectOriginalLedger(reloaded, original);
    reloaded.client.close();
  });

  it('clears all ledger data and preserves the intentional empty state across initialization', async () => {
    const storage = createMemorySqliteStorage();
    const firstSession = await createRepositories(storage);
    const seedInput = { ...firstSession, referenceDate: new Date(2026, 7, 9) };
    await seedStarterLedger(seedInput);

    await resetToEmptyLedger(firstSession.client);

    await expectEmptyLedger(firstSession);
    expect(firstSession.client.queryOne<{ value: string }>(
      'SELECT value FROM app_metadata WHERE key = ?',
      ['starter_ledger_v1'],
    )?.value).toBe('empty-ledger');
    firstSession.client.close();

    const secondSession = await createRepositories(storage);
    await seedStarterLedger({ ...secondSession, referenceDate: new Date(2026, 7, 9) });

    await expectEmptyLedger(secondSession);
    secondSession.client.close();
  });

  it('recovers the prior ledger when persisting a reset to zero fails', async () => {
    const storage = createFailOnceStorage();
    const firstSession = await createRepositories(storage);
    const original = await createOriginalLedger(firstSession);
    storage.failNextSave();

    await expect(resetToEmptyLedger(firstSession.client)).rejects.toThrow('Simulated persistence failure.');

    await expectOriginalLedger(firstSession, original);
    firstSession.client.close();

    const secondSession = await createRepositories(storage);
    await expectOriginalLedger(secondSession, original);
    secondSession.client.close();
  });

  it('deduplicates legacy category-month budgets before adding the unique startup index', async () => {
    const storage = createMemorySqliteStorage();
    const firstSession = await createRepositories(storage);
    const category = await firstSession.categoryRepository.create({ name: 'Groceries', type: 'expense' });
    await firstSession.client.execute('DROP INDEX idx_budgets_category_month');
    await insertBudget(firstSession.client, 'older', category.id, 10000, '2026-08', '2026-08-01T00:00:00.000Z');
    await insertBudget(firstSession.client, 'newer', category.id, 12500, '2026-08', '2026-08-02T00:00:00.000Z');
    firstSession.client.close();

    const secondSession = await createRepositories(storage);
    expect(await secondSession.budgetRepository.listByMonth('2026-08')).toEqual([
      expect.objectContaining({ amountCents: 12500, categoryId: category.id, id: 'newer' }),
    ]);
    await expect(insertBudget(
      secondSession.client,
      'duplicate',
      category.id,
      13000,
      '2026-08',
      '2026-08-03T00:00:00.000Z',
    )).rejects.toThrow(/UNIQUE constraint failed/);
    secondSession.client.close();
  });
});

async function createRepositories(storage: SqliteStorage = createMemorySqliteStorage()) {
  const client = await createSqliteClient({ locateFile: () => sqlWasmPath, storage });

  return {
    accountRepository: new SqliteAccountRepository(client),
    budgetRepository: new SqliteBudgetRepository(client),
    categoryRepository: new SqliteCategoryRepository(client),
    client,
    transactionRepository: new SqliteTransactionRepository(client),
  };
}

async function createOriginalLedger(repositories: Awaited<ReturnType<typeof createRepositories>>) {
  const account = await repositories.accountRepository.create({
    name: 'Original Checking',
    startingBalanceCents: 12345,
    type: 'checking',
  });
  const category = await repositories.categoryRepository.create({ name: 'Original Expense', type: 'expense' });
  const transaction = await repositories.transactionRepository.create({
    accountId: account.id,
    amountCents: -2500,
    categoryId: category.id,
    date: '2026-08-01',
    description: 'Original purchase',
  });
  const budget = await repositories.budgetRepository.upsert({
    amountCents: 10000,
    categoryId: category.id,
    month: '2026-08',
  });

  return { account, budget, category, transaction };
}

async function expectOriginalLedger(
  repositories: Awaited<ReturnType<typeof createRepositories>>,
  original: Awaited<ReturnType<typeof createOriginalLedger>>,
) {
  expect(await repositories.accountRepository.list()).toEqual([original.account]);
  expect(await repositories.categoryRepository.list()).toEqual([original.category]);
  expect(await repositories.transactionRepository.list()).toEqual([original.transaction]);
  expect(await repositories.budgetRepository.listByMonth('2026-08')).toEqual([original.budget]);
}

async function expectEmptyLedger(repositories: Awaited<ReturnType<typeof createRepositories>>) {
  expect(await repositories.accountRepository.list()).toEqual([]);
  expect(await repositories.categoryRepository.list()).toEqual([]);
  expect(await repositories.transactionRepository.list()).toEqual([]);
  expect(repositories.client.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM budgets')?.count).toBe(0);
  expect(repositories.client.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM transaction_tags')?.count).toBe(0);
}

function createFailOnceStorage(): SqliteStorage & { failNextSave: () => void } {
  let storedData: Uint8Array | null = null;
  let shouldFail = false;

  return {
    failNextSave() {
      shouldFail = true;
    },
    async load() {
      return storedData ? new Uint8Array(storedData) : null;
    },
    async save(data) {
      if (shouldFail) {
        shouldFail = false;
        throw new Error('Simulated persistence failure.');
      }
      storedData = new Uint8Array(data);
    },
  };
}

function insertBudget(
  client: SqliteClient,
  id: string,
  categoryId: string,
  amountCents: number,
  month: string,
  updatedAt: string,
) {
  return client.execute(
    `INSERT INTO budgets (id, category_id, month, amount_cents, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, categoryId, month, amountCents, updatedAt, updatedAt],
  );
}
