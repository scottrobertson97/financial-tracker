import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSqliteClient } from '../sqliteClient';
import { SqliteCategoryRepository } from './sqliteCategoryRepository';
import { SqliteBudgetRepository } from './sqliteBudgetRepository';

const sqlWasmPath = join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');

describe('SqliteBudgetRepository', () => {
  it('upserts one category budget per month, lists by month, and deletes it', async () => {
    const client = await createSqliteClient({ locateFile: () => sqlWasmPath, storage: null });
    const categoryRepository = new SqliteCategoryRepository(client);
    const repository = new SqliteBudgetRepository(client);
    const groceries = await categoryRepository.create({ name: 'Groceries', type: 'expense' });

    const created = await repository.upsert({ amountCents: 40000, categoryId: groceries.id, month: '2026-07' });
    const updated = await repository.upsert({ amountCents: 45000, categoryId: groceries.id, month: '2026-07' });
    await repository.upsert({ amountCents: 41000, categoryId: groceries.id, month: '2026-08' });

    expect(updated.id).toBe(created.id);
    expect(updated.amountCents).toBe(45000);
    expect(await repository.listByMonth('2026-07')).toEqual([
      expect.objectContaining({ amountCents: 45000, categoryId: groceries.id, month: '2026-07' }),
    ]);

    await repository.delete(groceries.id, '2026-07');
    expect(await repository.getByCategoryAndMonth(groceries.id, '2026-07')).toBeNull();
    expect(await repository.listByMonth('2026-08')).toHaveLength(1);

    client.close();
  });
});
