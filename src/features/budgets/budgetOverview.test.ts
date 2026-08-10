import { describe, expect, it } from 'vitest';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import type { Budget } from './budgetTypes';
import { calculateBudgetOverview } from './budgetOverview';

const categories: Category[] = [
  makeCategory('groceries', 'Groceries', 'expense'),
  makeCategory('dining', 'Dining out', 'expense'),
  makeCategory('paycheck', 'Paycheck', 'income'),
  makeCategory('transfer', 'Transfer', 'transfer'),
];

describe('calculateBudgetOverview', () => {
  it('calculates actual, remaining, used, and unbudgeted spending from net expenses', () => {
    const overview = calculateBudgetOverview({
      budgets: [makeBudget('groceries', '2026-07', 10000)],
      categories,
      month: '2026-07',
      referenceDate: '2026-07-31',
      transactions: [
        makeTransaction('grocery-pending', 'groceries', '2026-07-03', -8000, 'pending'),
        makeTransaction('grocery-refund', 'groceries', '2026-07-08', 2000),
        makeTransaction('dinner', 'dining', '2026-07-10', -3000),
        makeTransaction('uncategorized', null, '2026-07-11', -500),
        makeTransaction('paycheck', 'paycheck', '2026-07-12', 200000),
        makeTransaction('transfer-out', 'transfer', '2026-07-13', -50000),
        makeTransaction('transfer-in', 'transfer', '2026-07-13', 50000),
      ],
    });

    expect(overview.rows.find((row) => row.categoryId === 'groceries')).toMatchObject({
      actualCents: 6000,
      budgetCents: 10000,
      percentageUsed: 60,
      remainingCents: 4000,
    });
    expect(overview.rows.find((row) => row.categoryId === 'dining')).toMatchObject({
      actualCents: 3000,
      budgetCents: null,
      percentageUsed: null,
      remainingCents: null,
    });
    expect(overview.totalBudgetCents).toBe(10000);
    expect(overview.budgetedSpendingCents).toBe(6000);
    expect(overview.unbudgetedSpendingCents).toBe(3500);
    expect(overview.totalSpendingCents).toBe(9500);
    expect(overview.remainingCents).toBe(4000);
    expect(overview.percentageUsed).toBe(60);
    expect(overview.unbudgetedSpendingItems).toEqual([
      { amountCents: 3000, categoryId: 'dining', categoryName: 'Dining out' },
      { amountCents: 500, categoryId: null, categoryName: 'Uncategorized' },
    ]);
  });

  it('uses the preceding six complete calendar months for historical averages', () => {
    const overview = calculateBudgetOverview({
      budgets: [],
      categories,
      month: '2026-07',
      referenceDate: '2026-07-15',
      transactions: [
        makeTransaction('january', 'groceries', '2026-01-31', -6000),
        makeTransaction('january-refund', 'groceries', '2026-01-31', 600),
        makeTransaction('outside-history', 'groceries', '2025-12-31', -12000),
        makeTransaction('selected-month', 'groceries', '2026-07-02', -3000),
      ],
    });

    const groceries = overview.rows.find((row) => row.categoryId === 'groceries');
    expect(groceries?.historicalAverageCents).toBe(900);
    expect(groceries?.actualCents).toBe(3000);
  });

  it('excludes future-dated entries from the active month but keeps past selected months complete', () => {
    const transactions = [
      makeTransaction('recorded', 'groceries', '2026-07-10', -1000),
      makeTransaction('future', 'groceries', '2026-07-25', -2000),
    ];
    const active = calculateBudgetOverview({
      budgets: [makeBudget('groceries', '2026-07', 10000)],
      categories,
      month: '2026-07',
      referenceDate: '2026-07-15',
      transactions,
    });
    const past = calculateBudgetOverview({
      budgets: [makeBudget('groceries', '2026-07', 10000)],
      categories,
      month: '2026-07',
      referenceDate: '2026-08-15',
      transactions,
    });

    expect(active.rows.find((row) => row.categoryId === 'groceries')?.actualCents).toBe(1000);
    expect(past.rows.find((row) => row.categoryId === 'groceries')?.actualCents).toBe(3000);
  });

  it('excludes post-reference transactions from future-month actuals and historical averages', () => {
    const overview = calculateBudgetOverview({
      budgets: [makeBudget('groceries', '2026-10', 10000)],
      categories,
      month: '2026-10',
      referenceDate: '2026-08-15',
      transactions: [
        makeTransaction('july', 'groceries', '2026-07-10', -6000),
        makeTransaction('august-recorded', 'groceries', '2026-08-10', -6000),
        makeTransaction('august-future', 'groceries', '2026-08-20', -6000),
        makeTransaction('september-future', 'groceries', '2026-09-10', -6000),
        makeTransaction('october-future', 'groceries', '2026-10-10', -4000),
        makeTransaction('uncategorized-future', null, '2026-10-11', -500),
      ],
    });

    expect(overview.rows.find((row) => row.categoryId === 'groceries')).toMatchObject({
      actualCents: 0,
      historicalAverageCents: 2000,
    });
    expect(overview.unbudgetedSpendingCents).toBe(0);
    expect(overview.totalSpendingCents).toBe(0);
  });

  it('returns clear zero totals when no expense categories or spending exist', () => {
    const overview = calculateBudgetOverview({
      budgets: [makeBudget('paycheck', '2026-07', 10000)],
      categories: categories.filter((category) => category.type !== 'expense'),
      month: '2026-07',
      referenceDate: '2026-07-31',
      transactions: [],
    });

    expect(overview.rows).toEqual([]);
    expect(overview.totalBudgetCents).toBe(0);
    expect(overview.totalSpendingCents).toBe(0);
    expect(overview.percentageUsed).toBeNull();
    expect(overview.unbudgetedSpendingItems).toEqual([]);
  });
});

function makeBudget(categoryId: string, month: string, amountCents: number): Budget {
  return {
    amountCents,
    categoryId,
    createdAt: '2026-01-01T00:00:00.000Z',
    id: `${categoryId}-${month}`,
    month,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeCategory(id: string, name: string, type: Category['type']): Category {
  return {
    color: '#64748b',
    createdAt: '2026-01-01T00:00:00.000Z',
    id,
    name,
    type,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeTransaction(
  id: string,
  categoryId: string | null,
  date: string,
  amountCents: number,
  status: Transaction['status'] = 'cleared',
): Transaction {
  return {
    accountId: 'checking',
    amountCents,
    categoryId,
    createdAt: `${date}T12:00:00.000Z`,
    date,
    description: id,
    id,
    status,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}
