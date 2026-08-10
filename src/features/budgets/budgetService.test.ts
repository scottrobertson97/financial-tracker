import { describe, expect, it, vi } from 'vitest';
import type { CategoryRepository } from '../categories/categoryRepository';
import type { Category } from '../categories/categoryTypes';
import type { BudgetRepository } from './budgetRepository';
import { BudgetService } from './budgetService';

describe('BudgetService', () => {
  it('creates and updates budgets only for expense categories', async () => {
    const budgetRepository = makeBudgetRepository();
    const categoryRepository = makeCategoryRepository(makeCategory('groceries', 'expense'));
    const service = new BudgetService(budgetRepository, categoryRepository);

    await service.upsert({ amountCents: 45000, categoryId: 'groceries', month: '2026-07' });

    expect(budgetRepository.upsert).toHaveBeenCalledWith({
      amountCents: 45000,
      categoryId: 'groceries',
      month: '2026-07',
    });
  });

  it('rejects non-expense categories and invalid money or month values', async () => {
    const budgetRepository = makeBudgetRepository();
    const incomeService = new BudgetService(
      budgetRepository,
      makeCategoryRepository(makeCategory('paycheck', 'income')),
    );

    await expect(incomeService.upsert({ amountCents: 10000, categoryId: 'paycheck', month: '2026-07' }))
      .rejects.toThrow('expense categories');
    await expect(incomeService.upsert({ amountCents: 0, categoryId: 'paycheck', month: '2026-07' }))
      .rejects.toThrow('greater than zero');
    expect(() => incomeService.listForMonth('2026-13')).toThrow('YYYY-MM');
    expect(budgetRepository.upsert).not.toHaveBeenCalled();
  });

  it('validates and delegates list and delete operations', async () => {
    const budgetRepository = makeBudgetRepository();
    const service = new BudgetService(budgetRepository, makeCategoryRepository(null));

    await service.listForMonth('2026-07');
    await service.delete('groceries', '2026-07');

    expect(budgetRepository.listByMonth).toHaveBeenCalledWith('2026-07');
    expect(budgetRepository.delete).toHaveBeenCalledWith('groceries', '2026-07');
  });
});

function makeBudgetRepository(): BudgetRepository {
  return {
    delete: vi.fn().mockResolvedValue(undefined),
    getByCategoryAndMonth: vi.fn().mockResolvedValue(null),
    listByMonth: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockImplementation(async (input) => ({
      ...input,
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'budget',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })),
  };
}

function makeCategoryRepository(category: Category | null): CategoryRepository {
  return {
    create: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn().mockResolvedValue(category),
    list: vi.fn(),
    update: vi.fn(),
  };
}

function makeCategory(id: string, type: Category['type']): Category {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    id,
    name: id,
    type,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
