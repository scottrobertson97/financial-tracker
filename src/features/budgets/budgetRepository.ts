import type { Budget } from './budgetTypes';

export interface UpsertBudgetInput {
  categoryId: string;
  month: string;
  amountCents: number;
}

export interface BudgetRepository {
  delete(categoryId: string, month: string): Promise<void>;
  getByCategoryAndMonth(categoryId: string, month: string): Promise<Budget | null>;
  listByMonth(month: string): Promise<Budget[]>;
  upsert(input: UpsertBudgetInput): Promise<Budget>;
}
