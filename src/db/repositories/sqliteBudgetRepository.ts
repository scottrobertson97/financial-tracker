import type { BudgetRepository, UpsertBudgetInput } from '../../features/budgets/budgetRepository';
import type { Budget } from '../../features/budgets/budgetTypes';
import { createId } from '../../shared/ids';
import type { SqliteClient, SqliteRow } from '../sqliteClient';

interface BudgetRow extends SqliteRow {
  amount_cents: number;
  category_id: string;
  created_at: string;
  id: string;
  month: string;
  updated_at: string;
}

export class SqliteBudgetRepository implements BudgetRepository {
  constructor(private readonly client: SqliteClient) {}

  async delete(categoryId: string, month: string): Promise<void> {
    await this.client.execute('DELETE FROM budgets WHERE category_id = ? AND month = ?', [categoryId, month]);
  }

  async getByCategoryAndMonth(categoryId: string, month: string): Promise<Budget | null> {
    const row = this.client.queryOne<BudgetRow>(
      `SELECT id, category_id, month, amount_cents, created_at, updated_at
       FROM budgets
       WHERE category_id = ? AND month = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [categoryId, month],
    );

    return row ? mapBudget(row) : null;
  }

  async listByMonth(month: string): Promise<Budget[]> {
    return this.client
      .queryAll<BudgetRow>(
        `SELECT id, category_id, month, amount_cents, created_at, updated_at
         FROM budgets
         WHERE month = ?
         ORDER BY created_at ASC, id ASC`,
        [month],
      )
      .map(mapBudget);
  }

  async upsert(input: UpsertBudgetInput): Promise<Budget> {
    const existing = await this.getByCategoryAndMonth(input.categoryId, input.month);
    const now = new Date().toISOString();

    if (existing) {
      const updated = { ...existing, amountCents: input.amountCents, updatedAt: now };
      await this.client.execute(
        `UPDATE budgets SET amount_cents = ?, updated_at = ?
         WHERE category_id = ? AND month = ?`,
        [updated.amountCents, updated.updatedAt, updated.categoryId, updated.month],
      );
      return updated;
    }

    const budget: Budget = {
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      createdAt: now,
      id: createId(),
      month: input.month,
      updatedAt: now,
    };
    await this.client.execute(
      `INSERT INTO budgets (id, category_id, month, amount_cents, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [budget.id, budget.categoryId, budget.month, budget.amountCents, budget.createdAt, budget.updatedAt],
    );

    return budget;
  }
}

function mapBudget(row: BudgetRow): Budget {
  return {
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    createdAt: row.created_at,
    id: row.id,
    month: row.month,
    updatedAt: row.updated_at,
  };
}
