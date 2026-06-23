import { describe, expect, it } from 'vitest';
import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import { calculateDashboardSummary } from './dashboardService';

const accounts: Account[] = [
  {
    id: 'checking',
    name: 'Checking',
    type: 'checking',
    startingBalanceCents: 100000,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'cash',
    name: 'Cash',
    type: 'cash',
    startingBalanceCents: 2500,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

const categories: Category[] = [
  {
    id: 'groceries',
    name: 'Groceries',
    type: 'expense',
    color: '#15803d',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'paycheck',
    name: 'Paycheck',
    type: 'income',
    color: '#166534',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

const transactions: Transaction[] = [
  {
    id: 'income',
    accountId: 'checking',
    categoryId: 'paycheck',
    amountCents: 300000,
    createdAt: '2026-06-02T12:00:00.000Z',
    date: '2026-06-02',
    description: 'Paycheck',
    status: 'cleared',
    updatedAt: '2026-06-02T12:00:00.000Z',
  },
  {
    id: 'groceries',
    accountId: 'checking',
    categoryId: 'groceries',
    amountCents: -8000,
    createdAt: '2026-06-05T12:00:00.000Z',
    date: '2026-06-05',
    description: 'Groceries',
    status: 'cleared',
    updatedAt: '2026-06-05T12:00:00.000Z',
  },
  {
    id: 'cash-snack',
    accountId: 'cash',
    categoryId: null,
    amountCents: -500,
    createdAt: '2026-06-06T12:00:00.000Z',
    date: '2026-06-06',
    description: 'Snack',
    status: 'cleared',
    updatedAt: '2026-06-06T12:00:00.000Z',
  },
  {
    id: 'old-expense',
    accountId: 'checking',
    categoryId: 'groceries',
    amountCents: -1000,
    createdAt: '2026-05-10T12:00:00.000Z',
    date: '2026-05-10',
    description: 'Old groceries',
    status: 'cleared',
    updatedAt: '2026-05-10T12:00:00.000Z',
  },
];

describe('calculateDashboardSummary', () => {
  it('calculates total balance and current-month cashflow', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      monthKey: '2026-06',
      transactions,
    });

    expect(summary.totalBalanceCents).toBe(393000);
    expect(summary.monthlyIncomeCents).toBe(300000);
    expect(summary.monthlyExpensesCents).toBe(8500);
    expect(summary.netCashflowCents).toBe(291500);
  });

  it('sorts top expense categories and recent transactions', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      monthKey: '2026-06',
      transactions,
    });

    expect(summary.topExpenseCategories).toEqual([
      { amountCents: 8000, categoryId: 'groceries', name: 'Groceries' },
      { amountCents: 500, categoryId: null, name: 'Uncategorized' },
    ]);
    expect(summary.recentTransactions.map((transaction) => transaction.id)).toEqual([
      'cash-snack',
      'groceries',
      'income',
      'old-expense',
    ]);
  });
});
