import { z } from 'zod';
import type { CategoryRepository } from '../categories/categoryRepository';
import type { BudgetRepository, UpsertBudgetInput } from './budgetRepository';
import { parseOrThrow } from '../../shared/validation';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use a YYYY-MM month.');
const categoryIdSchema = z.string().trim().min(1, 'Category is required.');
const upsertBudgetSchema = z.object({
  amountCents: z.number().int().safe().positive('Budget amount must be greater than zero.'),
  categoryId: categoryIdSchema,
  month: monthSchema,
});

export class BudgetService {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  delete(categoryId: string, month: string) {
    return this.budgetRepository.delete(
      parseOrThrow(categoryIdSchema, categoryId),
      parseOrThrow(monthSchema, month),
    );
  }

  listForMonth(month: string) {
    return this.budgetRepository.listByMonth(parseOrThrow(monthSchema, month));
  }

  async upsert(input: UpsertBudgetInput) {
    const validInput = parseOrThrow(upsertBudgetSchema, input);
    const category = await this.categoryRepository.getById(validInput.categoryId);

    if (!category) {
      throw new Error('Category not found.');
    }
    if (category.type !== 'expense') {
      throw new Error('Budgets can only be created for expense categories.');
    }

    return this.budgetRepository.upsert(validInput);
  }
}
