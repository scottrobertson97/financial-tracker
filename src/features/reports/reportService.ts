import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import {
  formatMonthLabel,
  getCurrentDateIso,
  getDaysInMonth,
  getMonthKey,
  getMonthKeysEndingAt,
  getPreviousMonthKey,
} from '../../shared/dates';

export type ReportRangeMonths = 6 | 12;

export interface ReportMonth {
  label: string;
  monthKey: string;
}

export interface CategorySpendingSeries {
  categoryId: string | null;
  color: string;
  monthlyCents: number[];
  name: string;
  totalCents: number;
}

export interface CategorySpendingTrend {
  months: ReportMonth[];
  series: CategorySpendingSeries[];
  totalCents: number;
}

export interface MonthlyCashSurplusPoint {
  expenseCents: number;
  incomeCents: number;
  label: string;
  monthKey: string;
  surplusCents: number;
  surplusRate: number | null;
}

export interface CategorySpendingChange {
  categoryId: string | null;
  color: string;
  currentCents: number;
  deltaCents: number;
  deltaRate: number | null;
  name: string;
  previousCents: number;
}

export interface ExpenseMerchantInsight {
  amountCents: number;
  merchant: string;
  transactionCount: number;
}

export interface LargestTransactionInsight {
  amountCents: number;
  categoryName: string;
  date: string;
  description: string;
  id: string;
  merchant: string | null;
}

export interface ReportReviewCounts {
  needsReviewCount: number;
  pendingCount: number;
  uncategorizedCount: number;
}

export interface ReportPeriodTotals {
  expenseCents: number;
  incomeCents: number;
  surplusCents: number;
  surplusRate: number | null;
}

export interface ReportSummary {
  categoryChanges: CategorySpendingChange[];
  categorySpendingTrend: CategorySpendingTrend;
  cashSurplusTrend: MonthlyCashSurplusPoint[];
  largestTransaction: LargestTransactionInsight | null;
  periodTotals: ReportPeriodTotals;
  rangeMonths: ReportRangeMonths;
  reviewCounts: ReportReviewCounts;
  topExpenseMerchants: ExpenseMerchantInsight[];
}

export interface CalculateReportInput {
  categories: Category[];
  months?: ReportRangeMonths;
  referenceDate?: string;
  transactions: Transaction[];
}

const FALLBACK_COLORS = [
  '#2563eb',
  '#15803d',
  '#b42318',
  '#7c3aed',
  '#c2410c',
  '#0f766e',
  '#a16207',
  '#4338ca',
] as const;

const UNCATEGORIZED_KEY = '__uncategorized__';
const OTHER_CATEGORY_ID = '__other__';

/**
 * Builds report-ready data without depending on repositories or React.
 *
 * Category type is authoritative: a positive amount in an expense category is
 * treated as a refund and reduces spending, while a negative amount in an
 * income category reduces income. Uncategorized entries fall back to their sign.
 */
export function calculateReportSummary({
  categories,
  months = 6,
  referenceDate = getCurrentDateIso(),
  transactions,
}: CalculateReportInput): ReportSummary {
  const currentMonthKey = getMonthKey(referenceDate);
  const reportMonths = getMonthKeysEndingAt(currentMonthKey, months).map((monthKey) => ({
    label: formatMonthLabel(monthKey),
    monthKey,
  }));
  const reportMonthKeys = new Set(reportMonths.map((month) => month.monthKey));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const reportTransactions = transactions.filter(
    (transaction) => transaction.date <= referenceDate && reportMonthKeys.has(getMonthKey(transaction.date)),
  );
  const cashSurplusTrend = calculateCashSurplusTrend(
    reportMonths,
    reportTransactions,
    categoryById,
  );
  const incomeCents = cashSurplusTrend.reduce((total, point) => total + point.incomeCents, 0);
  const expenseCents = cashSurplusTrend.reduce((total, point) => total + point.expenseCents, 0);
  const surplusCents = incomeCents - expenseCents;

  return {
    categoryChanges: calculateCategoryChanges(
      transactions,
      categories,
      categoryById,
      referenceDate,
    ),
    categorySpendingTrend: calculateCategorySpendingTrend(
      reportMonths,
      reportTransactions,
      categories,
      categoryById,
    ),
    cashSurplusTrend,
    largestTransaction: findLargestTransaction(reportTransactions, categoryById),
    periodTotals: {
      expenseCents,
      incomeCents,
      surplusCents,
      surplusRate: incomeCents > 0 ? surplusCents / incomeCents : null,
    },
    rangeMonths: months,
    reviewCounts: calculateReviewCounts(reportTransactions, categoryById),
    topExpenseMerchants: calculateTopExpenseMerchants(reportTransactions, categoryById),
  };
}

function calculateCashSurplusTrend(
  months: ReportMonth[],
  transactions: Transaction[],
  categoryById: Map<string, Category>,
): MonthlyCashSurplusPoint[] {
  return months.map(({ label, monthKey }) => {
    let expenseCents = 0;
    let incomeCents = 0;

    for (const transaction of transactions) {
      if (getMonthKey(transaction.date) !== monthKey) {
        continue;
      }

      expenseCents += getExpenseContribution(transaction, categoryById);
      incomeCents += getIncomeContribution(transaction, categoryById);
    }

    const surplusCents = incomeCents - expenseCents;
    return {
      expenseCents,
      incomeCents,
      label,
      monthKey,
      surplusCents,
      surplusRate: incomeCents > 0 ? surplusCents / incomeCents : null,
    };
  });
}

function calculateCategorySpendingTrend(
  months: ReportMonth[],
  transactions: Transaction[],
  categories: Category[],
  categoryById: Map<string, Category>,
): CategorySpendingTrend {
  const monthIndexes = new Map(months.map((month, index) => [month.monthKey, index]));
  const categoryTotals = new Map<string, number[]>();

  for (const transaction of transactions) {
    const contribution = getExpenseContribution(transaction, categoryById);
    const dimension = getExpenseDimension(transaction, categoryById);
    if (!dimension || contribution === 0) {
      continue;
    }

    const monthIndex = monthIndexes.get(getMonthKey(transaction.date));
    if (monthIndex === undefined) {
      continue;
    }

    const values = categoryTotals.get(dimension.key) ?? Array.from({ length: months.length }, () => 0);
    values[monthIndex] += contribution;
    categoryTotals.set(dimension.key, values);
  }

  const colorByCategoryId = new Map(categories.map((category) => [category.id, category.color]));
  const sortedSeries = Array.from(categoryTotals.entries())
    .map(([key, monthlyCents], index): CategorySpendingSeries => {
      const categoryId = key === UNCATEGORIZED_KEY ? null : key;
      return {
        categoryId,
        color: getCategoryColor(categoryId, colorByCategoryId, index),
        monthlyCents,
        name: getCategoryName(categoryId, categoryById),
        totalCents: sum(monthlyCents),
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name));
  const visibleSeries = sortedSeries.slice(0, 5);
  const remainingSeries = sortedSeries.slice(5);

  if (remainingSeries.length > 0) {
    const monthlyCents = months.map((_, monthIndex) =>
      remainingSeries.reduce((total, series) => total + series.monthlyCents[monthIndex], 0));
    visibleSeries.push({
      categoryId: OTHER_CATEGORY_ID,
      color: '#64748b',
      monthlyCents,
      name: 'Other',
      totalCents: sum(monthlyCents),
    });
  }

  return {
    months,
    series: visibleSeries,
    totalCents: sortedSeries.reduce((total, series) => total + series.totalCents, 0),
  };
}

function calculateCategoryChanges(
  transactions: Transaction[],
  categories: Category[],
  categoryById: Map<string, Category>,
  referenceDate: string,
): CategorySpendingChange[] {
  const currentMonthKey = getMonthKey(referenceDate);
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const comparisonDay = Math.min(Number(referenceDate.slice(8, 10)), getDaysInMonth(previousMonthKey));
  const currentEndpoint = `${currentMonthKey}-${String(comparisonDay).padStart(2, '0')}`;
  const previousEndpoint = `${previousMonthKey}-${String(comparisonDay).padStart(2, '0')}`;
  const currentTotals = new Map<string, number>();
  const previousTotals = new Map<string, number>();

  for (const transaction of transactions) {
    const dimension = getExpenseDimension(transaction, categoryById);
    const contribution = getExpenseContribution(transaction, categoryById);
    if (!dimension || contribution === 0) {
      continue;
    }

    if (transaction.date >= `${currentMonthKey}-01` && transaction.date <= currentEndpoint) {
      currentTotals.set(dimension.key, (currentTotals.get(dimension.key) ?? 0) + contribution);
    } else if (transaction.date >= `${previousMonthKey}-01` && transaction.date <= previousEndpoint) {
      previousTotals.set(dimension.key, (previousTotals.get(dimension.key) ?? 0) + contribution);
    }
  }

  const colorByCategoryId = new Map(categories.map((category) => [category.id, category.color]));
  const keys = new Set([...currentTotals.keys(), ...previousTotals.keys()]);

  return Array.from(keys)
    .map((key, index): CategorySpendingChange => {
      const categoryId = key === UNCATEGORIZED_KEY ? null : key;
      const currentCents = currentTotals.get(key) ?? 0;
      const previousCents = previousTotals.get(key) ?? 0;
      const deltaCents = currentCents - previousCents;
      return {
        categoryId,
        color: getCategoryColor(categoryId, colorByCategoryId, index),
        currentCents,
        deltaCents,
        deltaRate: previousCents > 0 ? deltaCents / previousCents : null,
        name: getCategoryName(categoryId, categoryById),
        previousCents,
      };
    })
    .sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents) || a.name.localeCompare(b.name));
}

function calculateTopExpenseMerchants(
  transactions: Transaction[],
  categoryById: Map<string, Category>,
): ExpenseMerchantInsight[] {
  const merchantTotals = new Map<string, ExpenseMerchantInsight>();

  for (const transaction of transactions) {
    const amountCents = getExpenseContribution(transaction, categoryById);
    const merchant = transaction.merchant?.trim();
    if (!merchant || amountCents === 0) {
      continue;
    }

    const key = merchant.toLocaleLowerCase();
    const current = merchantTotals.get(key) ?? { amountCents: 0, merchant, transactionCount: 0 };
    current.amountCents += amountCents;
    current.transactionCount += 1;
    merchantTotals.set(key, current);
  }

  return Array.from(merchantTotals.values())
    .filter((merchant) => merchant.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents || a.merchant.localeCompare(b.merchant))
    .slice(0, 5);
}

function findLargestTransaction(
  transactions: Transaction[],
  categoryById: Map<string, Category>,
): LargestTransactionInsight | null {
  const eligibleTransactions = transactions.filter(
    (transaction) => getTransactionKind(transaction, categoryById) !== 'transfer',
  );
  const largest = [...eligibleTransactions].sort((a, b) =>
    Math.abs(b.amountCents) - Math.abs(a.amountCents)
      || `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`))[0];

  if (!largest) {
    return null;
  }

  return {
    amountCents: largest.amountCents,
    categoryName: getCategoryName(largest.categoryId ?? null, categoryById),
    date: largest.date,
    description: largest.description,
    id: largest.id,
    merchant: largest.merchant?.trim() || null,
  };
}

function calculateReviewCounts(
  transactions: Transaction[],
  categoryById: Map<string, Category>,
): ReportReviewCounts {
  const eligibleTransactions = transactions.filter(
    (transaction) => getTransactionKind(transaction, categoryById) !== 'transfer',
  );
  const uncategorizedIds = new Set(
    eligibleTransactions.filter((transaction) => !transaction.categoryId).map((transaction) => transaction.id),
  );
  const pendingIds = new Set(
    eligibleTransactions.filter((transaction) => transaction.status === 'pending').map((transaction) => transaction.id),
  );

  return {
    needsReviewCount: new Set([...uncategorizedIds, ...pendingIds]).size,
    pendingCount: pendingIds.size,
    uncategorizedCount: uncategorizedIds.size,
  };
}

type TransactionKind = 'expense' | 'income' | 'neutral' | 'transfer';

function getTransactionKind(
  transaction: Transaction,
  categoryById: Map<string, Category>,
): TransactionKind {
  const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
  if (category?.type === 'transfer') {
    return 'transfer';
  }
  if (category?.type === 'expense') {
    return 'expense';
  }
  if (category?.type === 'income') {
    return 'income';
  }
  if (transaction.amountCents < 0) {
    return 'expense';
  }
  if (transaction.amountCents > 0) {
    return 'income';
  }
  return 'neutral';
}

function getExpenseContribution(
  transaction: Transaction,
  categoryById: Map<string, Category>,
): number {
  return getTransactionKind(transaction, categoryById) === 'expense' ? -transaction.amountCents : 0;
}

function getIncomeContribution(
  transaction: Transaction,
  categoryById: Map<string, Category>,
): number {
  return getTransactionKind(transaction, categoryById) === 'income' ? transaction.amountCents : 0;
}

function getExpenseDimension(
  transaction: Transaction,
  categoryById: Map<string, Category>,
): { key: string } | null {
  if (getTransactionKind(transaction, categoryById) !== 'expense') {
    return null;
  }
  return { key: transaction.categoryId ?? UNCATEGORIZED_KEY };
}

function getCategoryName(categoryId: string | null, categoryById: Map<string, Category>): string {
  if (categoryId === null) {
    return 'Uncategorized';
  }
  return categoryById.get(categoryId)?.name ?? 'Unknown category';
}

function getCategoryColor(
  categoryId: string | null,
  colorByCategoryId: Map<string, string | null | undefined>,
  index: number,
): string {
  if (categoryId === null) {
    return '#64748b';
  }
  return colorByCategoryId.get(categoryId) || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
