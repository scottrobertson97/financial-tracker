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
  {
    id: 'transfer',
    name: 'Transfer',
    type: 'transfer',
    color: '#475569',
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
      referenceDate: '2026-06-30',
      transactions,
    });

    expect(summary.totalBalanceCents).toBe(393000);
    expect(summary.monthlyIncomeCents).toBe(300000);
    expect(summary.monthlyExpensesCents).toBe(8500);
    expect(summary.netCashflowCents).toBe(291500);
  });

  it('separates positive account balances from debt and reports signed net worth', () => {
    const creditAccount: Account = {
      id: 'credit-card',
      name: 'Credit card',
      type: 'credit',
      startingBalanceCents: -50000,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    };
    const summary = calculateDashboardSummary({
      accounts: [...accounts, creditAccount],
      categories,
      referenceDate: '2026-06-30',
      transactions,
    });

    expect(summary.recordedAssetsCents).toBe(393000);
    expect(summary.recordedDebtCents).toBe(50000);
    expect(summary.recordedNetWorthCents).toBe(343000);
    expect(summary.totalBalanceCents).toBe(summary.recordedNetWorthCents);
  });

  it('sorts top expense categories and recent transactions', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
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

  it('calculates current-month expense usage chart data', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions,
    });

    expect(summary.categoryUsageChartData).toEqual([
      {
        amountCents: 8000,
        categoryId: 'groceries',
        color: '#15803d',
        name: 'Groceries',
        percentage: expect.closeTo(94.117647, 5),
      },
      {
        amountCents: 500,
        categoryId: null,
        color: '#64748b',
        name: 'Uncategorized',
        percentage: expect.closeTo(5.882353, 5),
      },
    ]);
    expect(summary.categoryUsageChartData.reduce((total, item) => total + (item.percentage ?? 0), 0)).toBeCloseTo(100);
  });

  it('returns empty chart data when there are no current-month expenses', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-07-31',
      transactions,
    });

    expect(summary.categoryUsageChartData).toEqual([]);
  });

  it('keeps transfers in balances but excludes them from cashflow and spending', () => {
    const transferPair = [
      { ...makeTransaction('transfer-out', '2026-06-07', -50000), categoryId: 'transfer' },
      { ...makeTransaction('transfer-in', '2026-06-07', 50000), categoryId: 'transfer' },
    ];
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions: [...transactions, ...transferPair],
    });

    expect(summary.totalBalanceCents).toBe(393000);
    expect(summary.monthlyIncomeCents).toBe(300000);
    expect(summary.monthlyExpensesCents).toBe(8500);
    expect(summary.cashFlowTrend.at(-1)).toMatchObject({
      expenseCents: 8500,
      incomeCents: 300000,
      netCents: 291500,
    });
    expect(summary.spendingPace.currentToDateCents).toBe(8500);
    expect(summary.categoryUsageChartData).not.toContainEqual(
      expect.objectContaining({ categoryId: 'transfer' }),
    );
  });

  it('uses category intent so refunds and income reversals net against the right flow', () => {
    const refund = { ...makeTransaction('grocery-refund', '2026-06-08', 2000), categoryId: 'groceries' };
    const incomeReversal = { ...makeTransaction('pay-reversal', '2026-06-09', -10000), categoryId: 'paycheck' };
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions: [...transactions, refund, incomeReversal],
    });

    expect(summary.monthlyIncomeCents).toBe(290000);
    expect(summary.monthlyExpensesCents).toBe(6500);
    expect(summary.netCashflowCents).toBe(283500);
    expect(summary.topExpenseCategories).toEqual([
      { amountCents: 6000, categoryId: 'groceries', name: 'Groceries' },
      { amountCents: 500, categoryId: null, name: 'Uncategorized' },
    ]);
    expect(summary.cashFlowTrend.at(-1)).toMatchObject({
      expenseCents: 6500,
      incomeCents: 290000,
      netCents: 283500,
    });
    expect(summary.spendingPace.currentToDateCents).toBe(6500);
  });

  it('keeps a refund-heavy expense category visible without assigning it a spending share', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-07-31',
      transactions: [
        { ...makeTransaction('purchase', '2026-07-02', -1000), categoryId: 'groceries' },
        { ...makeTransaction('refund', '2026-07-03', 2500), categoryId: 'groceries' },
      ],
    });

    expect(summary.monthlyExpensesCents).toBe(-1500);
    expect(summary.topExpenseCategories).toEqual([
      { amountCents: -1500, categoryId: 'groceries', name: 'Groceries' },
    ]);
    expect(summary.categoryUsageChartData).toEqual([
      expect.objectContaining({ amountCents: -1500, categoryId: 'groceries', percentage: null }),
    ]);
  });

  it('builds six- and twelve-month cash flow trends with empty buckets', () => {
    const sixMonthSummary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions,
      trendMonths: 6,
    });

    expect(sixMonthSummary.cashFlowTrend.map((point) => point.monthKey)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    ]);
    expect(sixMonthSummary.cashFlowTrend[0]).toMatchObject({ expenseCents: 0, incomeCents: 0, netCents: 0 });
    expect(sixMonthSummary.cashFlowTrend.at(-2)).toMatchObject({ expenseCents: 1000, incomeCents: 0, netCents: -1000 });
    expect(sixMonthSummary.cashFlowTrend.at(-1)).toMatchObject({
      expenseCents: 8500,
      incomeCents: 300000,
      netCents: 291500,
    });

    const twelveMonthSummary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions,
      trendMonths: 12,
    });

    expect(twelveMonthSummary.cashFlowTrend).toHaveLength(12);
    expect(twelveMonthSummary.cashFlowTrend[0].monthKey).toBe('2025-07');
  });

  it('calculates a rolling cash-surplus rate and returns null without income', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions,
    });

    expect(summary.rollingCashSurplus).toEqual({
      expenseCents: 9500,
      incomeCents: 300000,
      ratePercentage: expect.closeTo(96.833333, 5),
      surplusCents: 290500,
    });

    const noIncomeSummary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions: [makeTransaction('expense-only', '2026-06-05', -1200)],
    });

    expect(noIncomeSummary.rollingCashSurplus).toEqual({
      expenseCents: 1200,
      incomeCents: 0,
      ratePercentage: null,
      surplusCents: -1200,
    });
  });

  it('counts pending and uncategorized transactions as overlapping review queues', () => {
    const pendingCategorized = { ...makeTransaction('pending', '2026-06-10', -100), status: 'pending' as const };
    const pendingUncategorized = {
      ...makeTransaction('pending-uncategorized', '2026-06-11', -200),
      categoryId: null,
      status: 'pending' as const,
    };
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions: [...transactions, pendingCategorized, pendingUncategorized],
    });

    expect(summary.reviewQueue).toEqual({ pendingCount: 2, uncategorizedCount: 2 });
  });

  it('calculates balance history from starting balances through each endpoint', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-30',
      transactions,
      trendMonths: 6,
    });

    expect(summary.balanceTrend.map((point) => point.balanceCents)).toEqual([
      102500,
      102500,
      102500,
      102500,
      101500,
      393000,
    ]);
  });

  it('excludes transactions after the reference date from trend points', () => {
    const future = {
      ...makeTransaction('future', '2026-06-25', -2000),
      categoryId: null,
      status: 'pending' as const,
    };
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-10',
      transactions: [...transactions, future],
    });

    expect(summary.cashFlowTrend.at(-1)).toMatchObject({ expenseCents: 8500, netCents: 291500 });
    expect(summary.balanceTrend.at(-1)?.balanceCents).toBe(393000);
    expect(summary.recordedNetWorthCents).toBe(393000);
    expect(summary.recentTransactions.map((transaction) => transaction.id)).not.toContain('future');
    expect(summary.reviewQueue).toEqual({ pendingCount: 0, uncategorizedCount: 1 });
  });

  it('calculates cumulative spending pace and equal-day comparison values', () => {
    const paceTransactions = [
      makeTransaction('previous-early', '2026-05-02', -1000),
      makeTransaction('previous-late', '2026-05-20', -2000),
      makeTransaction('current', '2026-06-03', -1500),
      makeTransaction('current-future', '2026-06-07', -500),
      makeTransaction('income', '2026-06-04', 9000),
    ];
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2026-06-05',
      transactions: paceTransactions,
    });

    expect(summary.spendingPace.currentToDateCents).toBe(1500);
    expect(summary.spendingPace.previousToDateCents).toBe(1000);
    expect(summary.spendingPace.deltaCents).toBe(500);
    expect(summary.spendingPace.deltaPercentage).toBe(50);
    expect(summary.spendingPace.points[4]).toMatchObject({ currentMonthCents: 1500, previousMonthCents: 1000 });
    expect(summary.spendingPace.points[5].currentMonthCents).toBeNull();
    expect(summary.spendingPace.points[19].previousMonthCents).toBe(3000);
  });

  it('handles leap-year month lengths and zero prior spending', () => {
    const summary = calculateDashboardSummary({
      accounts,
      categories,
      referenceDate: '2024-03-31',
      transactions: [makeTransaction('march-expense', '2024-03-31', -1200)],
    });

    expect(summary.spendingPace.points).toHaveLength(31);
    expect(summary.spendingPace.points[28].previousMonthCents).toBe(0);
    expect(summary.spendingPace.points[29].previousMonthCents).toBeNull();
    expect(summary.spendingPace.deltaPercentage).toBeNull();
  });

  it('groups positive expense categories after the top five into Other spending', () => {
    const manyCategories: Category[] = Array.from({ length: 6 }, (_, index) => ({
      id: `category-${index + 1}`,
      name: `Category ${index + 1}`,
      type: 'expense',
      color: `#00000${index + 1}`,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    }));
    const manyTransactions: Transaction[] = manyCategories.map((category, index) => ({
      ...makeTransaction(`transaction-${index + 1}`, '2026-06-05', -(600 - index * 100)),
      categoryId: category.id,
    }));
    const summary = calculateDashboardSummary({
      accounts,
      categories: manyCategories,
      referenceDate: '2026-06-30',
      transactions: manyTransactions,
    });

    expect(summary.topExpenseCategories).toHaveLength(5);
    expect(summary.categoryUsageChartData).toHaveLength(6);
    expect(summary.categoryUsageChartData.at(-1)).toMatchObject({
      amountCents: 100,
      categoryId: '__other_spending__',
      name: 'Other spending',
    });
    expect(summary.categoryUsageChartData.reduce((total, item) => total + (item.percentage ?? 0), 0)).toBeCloseTo(100);
  });

  it('keeps grouped spending and refunds separate so positive shares stay exact', () => {
    const mixedCategories: Category[] = Array.from({ length: 7 }, (_, index) => ({
      id: `mixed-${index + 1}`,
      name: `Mixed ${index + 1}`,
      type: 'expense',
      color: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    }));
    const amounts = [-600, -500, -400, -300, -200, -100, 50];
    const summary = calculateDashboardSummary({
      accounts,
      categories: mixedCategories,
      referenceDate: '2026-06-30',
      transactions: mixedCategories.map((category, index) => ({
        ...makeTransaction(`mixed-transaction-${index + 1}`, '2026-06-05', amounts[index]),
        categoryId: category.id,
      })),
    });

    expect(summary.categoryUsageChartData).toEqual(expect.arrayContaining([
      expect.objectContaining({ amountCents: 100, categoryId: '__other_spending__', percentage: expect.closeTo(100 / 21, 5) }),
      expect.objectContaining({ amountCents: -50, categoryId: '__other_refunds__', percentage: null }),
    ]));
    expect(summary.categoryUsageChartData
      .reduce((total, item) => total + Math.max(item.amountCents, 0), 0)).toBe(2100);
    expect(summary.categoryUsageChartData
      .reduce((total, item) => total + (item.percentage ?? 0), 0)).toBeCloseTo(100);
  });
});

function makeTransaction(id: string, date: string, amountCents: number): Transaction {
  return {
    id,
    accountId: 'checking',
    categoryId: amountCents < 0 ? 'groceries' : 'paycheck',
    amountCents,
    createdAt: `${date}T12:00:00.000Z`,
    date,
    description: id,
    status: 'cleared',
    updatedAt: `${date}T12:00:00.000Z`,
  };
}
