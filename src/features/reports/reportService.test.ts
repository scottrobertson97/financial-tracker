import { describe, expect, it } from 'vitest';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import { calculateReportSummary } from './reportService';

const createdAt = '2026-01-01T00:00:00.000Z';

function category(id: string, name: string, type: Category['type']): Category {
  return { color: null, createdAt, id, name, type, updatedAt: createdAt };
}

function transaction(
  id: string,
  overrides: Partial<Transaction> & Pick<Transaction, 'amountCents' | 'date'>,
): Transaction {
  return {
    accountId: 'checking',
    categoryId: null,
    createdAt,
    description: id,
    id,
    merchant: null,
    notes: null,
    status: 'cleared',
    updatedAt: createdAt,
    ...overrides,
  };
}

describe('calculateReportSummary', () => {
  it('uses category type for cash flow, nets refunds, and excludes transfers', () => {
    const categories = [
      category('income', 'Pay', 'income'),
      category('groceries', 'Groceries', 'expense'),
      category('transfer', 'Transfer', 'transfer'),
    ];
    const transactions = [
      transaction('pay', { amountCents: 100_000, categoryId: 'income', date: '2026-08-01' }),
      transaction('pay-reversal', { amountCents: -10_000, categoryId: 'income', date: '2026-08-02' }),
      transaction('groceries', {
        amountCents: -30_000,
        categoryId: 'groceries',
        date: '2026-08-03',
        merchant: 'Market',
        status: 'pending',
      }),
      transaction('refund', {
        amountCents: 5_000,
        categoryId: 'groceries',
        date: '2026-08-04',
        merchant: 'market',
      }),
      transaction('uncategorized', {
        amountCents: -2_000,
        date: '2026-08-05',
        status: 'pending',
      }),
      transaction('unknown-income', { amountCents: 3_000, categoryId: 'missing', date: '2026-08-06' }),
      transaction('transfer', {
        amountCents: -200_000,
        categoryId: 'transfer',
        date: '2026-08-07',
        merchant: 'Bank',
        status: 'pending',
      }),
    ];

    const summary = calculateReportSummary({
      categories,
      months: 6,
      referenceDate: '2026-08-09',
      transactions,
    });
    const august = summary.cashSurplusTrend.at(-1);

    expect(august).toMatchObject({
      expenseCents: 27_000,
      incomeCents: 93_000,
      surplusCents: 66_000,
    });
    expect(august?.surplusRate).toBeCloseTo(66_000 / 93_000);
    expect(summary.categorySpendingTrend.totalCents).toBe(27_000);
    expect(summary.categorySpendingTrend.series.map((series) => [series.name, series.totalCents])).toEqual([
      ['Groceries', 25_000],
      ['Uncategorized', 2_000],
    ]);
    expect(summary.topExpenseMerchants).toEqual([
      { amountCents: 25_000, merchant: 'Market', transactionCount: 2 },
    ]);
    expect(summary.largestTransaction).toMatchObject({ id: 'pay', amountCents: 100_000 });
    expect(summary.reviewCounts).toEqual({ needsReviewCount: 2, pendingCount: 2, uncategorizedCount: 1 });
  });

  it('groups category ranks after the top five into an exact Other series', () => {
    const categories = Array.from({ length: 6 }, (_, index) =>
      category(`expense-${index + 1}`, `Expense ${index + 1}`, 'expense'));
    const transactions = categories.map((item, index) => transaction(`transaction-${index}`, {
      amountCents: -(index + 1) * 100,
      categoryId: item.id,
      date: '2026-08-01',
    }));

    const summary = calculateReportSummary({
      categories,
      referenceDate: '2026-08-09',
      transactions,
    });

    expect(summary.categorySpendingTrend.series.map((series) => series.name)).toEqual([
      'Expense 6',
      'Expense 5',
      'Expense 4',
      'Expense 3',
      'Expense 2',
      'Other',
    ]);
    expect(summary.categorySpendingTrend.series.at(-1)).toMatchObject({
      categoryId: '__other__',
      monthlyCents: [0, 0, 0, 0, 0, 100],
      totalCents: 100,
    });
  });

  it('compares categories through the same day and ignores later activity in either month', () => {
    const categories = [
      category('groceries', 'Groceries', 'expense'),
      category('dining', 'Dining', 'expense'),
    ];
    const transactions = [
      transaction('july-grocery', { amountCents: -1_000, categoryId: 'groceries', date: '2026-07-05' }),
      transaction('july-grocery-late', { amountCents: -9_000, categoryId: 'groceries', date: '2026-07-10' }),
      transaction('august-grocery', { amountCents: -1_500, categoryId: 'groceries', date: '2026-08-05' }),
      transaction('august-grocery-late', { amountCents: -8_000, categoryId: 'groceries', date: '2026-08-10' }),
      transaction('july-dining', { amountCents: -3_000, categoryId: 'dining', date: '2026-07-09' }),
      transaction('august-dining', { amountCents: -1_000, categoryId: 'dining', date: '2026-08-09' }),
      transaction('august-dining-refund', { amountCents: 200, categoryId: 'dining', date: '2026-08-09' }),
    ];

    const summary = calculateReportSummary({
      categories,
      referenceDate: '2026-08-09',
      transactions,
    });

    expect(summary.categoryChanges).toEqual([
      expect.objectContaining({
        currentCents: 800,
        deltaCents: -2_200,
        deltaRate: -2_200 / 3_000,
        name: 'Dining',
        previousCents: 3_000,
      }),
      expect.objectContaining({
        currentCents: 1_500,
        deltaCents: 500,
        deltaRate: 0.5,
        name: 'Groceries',
        previousCents: 1_000,
      }),
    ]);
  });

  it('caps both periods when the previous month has fewer days', () => {
    const categories = [category('groceries', 'Groceries', 'expense')];
    const summary = calculateReportSummary({
      categories,
      referenceDate: '2026-03-31',
      transactions: [
        transaction('february-28', { amountCents: -1_000, categoryId: 'groceries', date: '2026-02-28' }),
        transaction('march-28', { amountCents: -1_500, categoryId: 'groceries', date: '2026-03-28' }),
        transaction('march-29', { amountCents: -9_000, categoryId: 'groceries', date: '2026-03-29' }),
        transaction('march-31', { amountCents: -9_000, categoryId: 'groceries', date: '2026-03-31' }),
      ],
    });

    expect(summary.categoryChanges).toEqual([
      expect.objectContaining({
        currentCents: 1_500,
        deltaCents: 500,
        name: 'Groceries',
        previousCents: 1_000,
      }),
    ]);
  });

  it('returns a null surplus rate whenever income is not positive', () => {
    const categories = [
      category('income', 'Income', 'income'),
      category('expense', 'Expense', 'expense'),
    ];
    const summary = calculateReportSummary({
      categories,
      referenceDate: '2026-08-09',
      transactions: [
        transaction('income-reversal', { amountCents: -1_000, categoryId: 'income', date: '2026-08-01' }),
        transaction('expense', { amountCents: -500, categoryId: 'expense', date: '2026-08-02' }),
      ],
    });

    expect(summary.cashSurplusTrend.at(-1)?.surplusRate).toBeNull();
    expect(summary.periodTotals.surplusRate).toBeNull();
  });
});
