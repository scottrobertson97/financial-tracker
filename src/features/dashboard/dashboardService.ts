import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import {
  formatMonthLabel,
  getCurrentDateIso,
  getDaysInMonth,
  getMonthEndDate,
  getMonthKey,
  getMonthKeysEndingAt,
  getPreviousMonthKey,
  isDateInMonth,
} from '../../shared/dates';

export type DashboardTrendMonths = 6 | 12;

export interface TopExpenseCategory {
  amountCents: number;
  categoryId: string | null;
  name: string;
}

export interface CategoryUsageChartItem {
  amountCents: number;
  categoryId: string | null;
  color: string;
  name: string;
  percentage: number;
}

export interface MonthlyCashFlowPoint {
  expenseCents: number;
  incomeCents: number;
  label: string;
  monthKey: string;
  netCents: number;
}

export interface MonthlyBalancePoint {
  balanceCents: number;
  label: string;
  monthKey: string;
}

export interface SpendingPacePoint {
  currentMonthCents: number | null;
  day: number;
  previousMonthCents: number | null;
}

export interface SpendingPaceSummary {
  currentMonthLabel: string;
  currentToDateCents: number;
  deltaCents: number;
  deltaPercentage: number | null;
  points: SpendingPacePoint[];
  previousMonthLabel: string;
  previousToDateCents: number;
}

export interface DashboardSummary {
  balanceTrend: MonthlyBalancePoint[];
  cashFlowTrend: MonthlyCashFlowPoint[];
  categoryUsageChartData: CategoryUsageChartItem[];
  monthlyExpensesCents: number;
  monthlyIncomeCents: number;
  netCashflowCents: number;
  recentTransactions: Transaction[];
  spendingPace: SpendingPaceSummary;
  topExpenseCategories: TopExpenseCategory[];
  totalBalanceCents: number;
}

const FALLBACK_CATEGORY_COLORS = [
  '#2563eb',
  '#15803d',
  '#b42318',
  '#7c3aed',
  '#c2410c',
  '#0f766e',
  '#a16207',
  '#4338ca',
  '#be123c',
  '#64748b',
] as const;

interface CalculateDashboardInput {
  accounts: Account[];
  categories: Category[];
  referenceDate?: string;
  trendMonths?: DashboardTrendMonths;
  transactions: Transaction[];
}

export function calculateDashboardSummary({
  accounts,
  categories,
  referenceDate = getCurrentDateIso(),
  trendMonths = 6,
  transactions,
}: CalculateDashboardInput): DashboardSummary {
  const monthKey = getMonthKey(referenceDate);
  const categoryDetails = new Map(categories.map((category) => [category.id, category]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const accountTotals = new Map(accounts.map((account) => [account.id, account.startingBalanceCents]));

  for (const transaction of transactions) {
    accountTotals.set(
      transaction.accountId,
      (accountTotals.get(transaction.accountId) ?? 0) + transaction.amountCents,
    );
  }

  const monthlyTransactions = transactions.filter(
    (transaction) => isDateInMonth(transaction.date, monthKey) && transaction.date <= referenceDate,
  );
  const monthlyIncomeCents = monthlyTransactions
    .filter((transaction) => transaction.amountCents > 0)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const monthlyExpenseTotal = monthlyTransactions
    .filter((transaction) => transaction.amountCents < 0)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const monthlyExpensesCents = Math.abs(monthlyExpenseTotal);
  const allExpenseCategories = calculateExpenseCategories(monthlyTransactions, categoryNames);
  const topExpenseCategories = allExpenseCategories.slice(0, 5);

  return {
    balanceTrend: calculateBalanceTrend(accounts, transactions, monthKey, referenceDate, trendMonths),
    cashFlowTrend: calculateCashFlowTrend(transactions, monthKey, referenceDate, trendMonths),
    categoryUsageChartData: calculateCategoryUsageChartData(
      allExpenseCategories,
      monthlyExpensesCents,
      categoryDetails,
    ),
    monthlyExpensesCents,
    monthlyIncomeCents,
    netCashflowCents: monthlyIncomeCents + monthlyExpenseTotal,
    recentTransactions: [...transactions]
      .sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`))
      .slice(0, 5),
    spendingPace: calculateSpendingPace(transactions, referenceDate),
    topExpenseCategories,
    totalBalanceCents: Array.from(accountTotals.values()).reduce((total, amount) => total + amount, 0),
  };
}

function calculateCategoryUsageChartData(
  expenseCategories: TopExpenseCategory[],
  totalExpensesCents: number,
  categoryDetails: Map<string, Category>,
): CategoryUsageChartItem[] {
  if (totalExpensesCents === 0) {
    return [];
  }

  const visibleCategories = expenseCategories.slice(0, 5);
  const otherAmountCents = expenseCategories
    .slice(5)
    .reduce((total, category) => total + category.amountCents, 0);
  const chartCategories = otherAmountCents > 0
    ? [...visibleCategories, { amountCents: otherAmountCents, categoryId: '__other__', name: 'Other' }]
    : visibleCategories;

  return chartCategories.map((category, index) => ({
    ...category,
    color:
      (category.categoryId ? categoryDetails.get(category.categoryId)?.color : '#64748b') ??
      FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length],
    percentage: (category.amountCents / totalExpensesCents) * 100,
  }));
}

function calculateExpenseCategories(
  transactions: Transaction[],
  categoryNames: Map<string, string>,
): TopExpenseCategory[] {
  const expenseTotals = new Map<string | null, number>();

  for (const transaction of transactions) {
    if (transaction.amountCents >= 0) {
      continue;
    }

    const categoryId = transaction.categoryId ?? null;
    expenseTotals.set(categoryId, (expenseTotals.get(categoryId) ?? 0) + Math.abs(transaction.amountCents));
  }

  return Array.from(expenseTotals.entries())
    .map(([categoryId, amountCents]) => ({
      amountCents,
      categoryId,
      name: categoryId ? categoryNames.get(categoryId) ?? 'Unknown category' : 'Uncategorized',
    }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

function calculateCashFlowTrend(
  transactions: Transaction[],
  currentMonthKey: string,
  referenceDate: string,
  trendMonths: DashboardTrendMonths,
): MonthlyCashFlowPoint[] {
  return getMonthKeysEndingAt(currentMonthKey, trendMonths).map((monthKey) => {
    const endpoint = monthKey === currentMonthKey ? referenceDate : getMonthEndDate(monthKey);
    const monthlyTransactions = transactions.filter(
      (transaction) => isDateInMonth(transaction.date, monthKey) && transaction.date <= endpoint,
    );
    const incomeCents = monthlyTransactions
      .filter((transaction) => transaction.amountCents > 0)
      .reduce((total, transaction) => total + transaction.amountCents, 0);
    const expenseCents = monthlyTransactions
      .filter((transaction) => transaction.amountCents < 0)
      .reduce((total, transaction) => total + Math.abs(transaction.amountCents), 0);

    return {
      expenseCents,
      incomeCents,
      label: formatMonthLabel(monthKey),
      monthKey,
      netCents: incomeCents - expenseCents,
    };
  });
}

function calculateBalanceTrend(
  accounts: Account[],
  transactions: Transaction[],
  currentMonthKey: string,
  referenceDate: string,
  trendMonths: DashboardTrendMonths,
): MonthlyBalancePoint[] {
  const startingBalanceCents = accounts.reduce((total, account) => total + account.startingBalanceCents, 0);

  return getMonthKeysEndingAt(currentMonthKey, trendMonths).map((monthKey) => {
    const endpoint = monthKey === currentMonthKey ? referenceDate : getMonthEndDate(monthKey);
    const transactionTotal = transactions
      .filter((transaction) => transaction.date <= endpoint)
      .reduce((total, transaction) => total + transaction.amountCents, 0);

    return {
      balanceCents: startingBalanceCents + transactionTotal,
      label: formatMonthLabel(monthKey),
      monthKey,
    };
  });
}

function calculateSpendingPace(
  transactions: Transaction[],
  referenceDate: string,
): SpendingPaceSummary {
  const currentMonthKey = getMonthKey(referenceDate);
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const currentMonthDays = getDaysInMonth(currentMonthKey);
  const previousMonthDays = getDaysInMonth(previousMonthKey);
  const referenceDay = Number(referenceDate.slice(8, 10));
  const pointCount = Math.max(currentMonthDays, previousMonthDays);
  const currentDailyTotals = getDailyExpenseTotals(transactions, currentMonthKey);
  const previousDailyTotals = getDailyExpenseTotals(transactions, previousMonthKey);
  const points: SpendingPacePoint[] = [];
  let currentCumulative = 0;
  let previousCumulative = 0;

  for (let day = 1; day <= pointCount; day += 1) {
    if (day <= referenceDay) {
      currentCumulative += currentDailyTotals.get(day) ?? 0;
    }
    if (day <= previousMonthDays) {
      previousCumulative += previousDailyTotals.get(day) ?? 0;
    }

    points.push({
      currentMonthCents: day <= referenceDay ? currentCumulative : null,
      day,
      previousMonthCents: day <= previousMonthDays ? previousCumulative : null,
    });
  }

  const comparisonDay = Math.min(referenceDay, previousMonthDays);
  const previousToDateCents = points[comparisonDay - 1]?.previousMonthCents ?? 0;
  const deltaCents = currentCumulative - previousToDateCents;

  return {
    currentMonthLabel: formatMonthLabel(currentMonthKey),
    currentToDateCents: currentCumulative,
    deltaCents,
    deltaPercentage: previousToDateCents > 0 ? (deltaCents / previousToDateCents) * 100 : null,
    points,
    previousMonthLabel: formatMonthLabel(previousMonthKey),
    previousToDateCents,
  };
}

function getDailyExpenseTotals(transactions: Transaction[], monthKey: string): Map<number, number> {
  const totals = new Map<number, number>();

  for (const transaction of transactions) {
    if (transaction.amountCents >= 0 || !isDateInMonth(transaction.date, monthKey)) {
      continue;
    }

    const day = Number(transaction.date.slice(8, 10));
    totals.set(day, (totals.get(day) ?? 0) + Math.abs(transaction.amountCents));
  }

  return totals;
}
