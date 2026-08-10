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
  percentage: number | null;
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

export interface RollingCashSurplus {
  expenseCents: number;
  incomeCents: number;
  ratePercentage: number | null;
  surplusCents: number;
}

export interface DashboardReviewQueue {
  pendingCount: number;
  uncategorizedCount: number;
}

export interface DashboardSummary {
  balanceTrend: MonthlyBalancePoint[];
  cashFlowTrend: MonthlyCashFlowPoint[];
  categoryUsageChartData: CategoryUsageChartItem[];
  monthlyExpensesCents: number;
  monthlyIncomeCents: number;
  netCashflowCents: number;
  recentTransactions: Transaction[];
  recordedAssetsCents: number;
  recordedDebtCents: number;
  recordedNetWorthCents: number;
  reviewQueue: DashboardReviewQueue;
  rollingCashSurplus: RollingCashSurplus;
  spendingPace: SpendingPaceSummary;
  topExpenseCategories: TopExpenseCategory[];
  /** @deprecated Use recordedNetWorthCents. */
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
  const accountTotals = new Map(accounts.map((account) => [account.id, account.startingBalanceCents]));
  const transactionsThroughReference = transactions.filter((transaction) => transaction.date <= referenceDate);

  for (const transaction of transactionsThroughReference) {
    accountTotals.set(
      transaction.accountId,
      (accountTotals.get(transaction.accountId) ?? 0) + transaction.amountCents,
    );
  }

  const monthlyTransactions = transactionsThroughReference.filter((transaction) =>
    isDateInMonth(transaction.date, monthKey)
      && transaction.date <= referenceDate,
  );
  const monthlyCashFlow = calculateCashFlowTotals(monthlyTransactions, categoryDetails);
  const monthlyIncomeCents = monthlyCashFlow.incomeCents;
  const monthlyExpensesCents = monthlyCashFlow.expenseCents;
  const allExpenseCategories = calculateExpenseCategories(monthlyTransactions, categoryDetails);
  const topExpenseCategories = allExpenseCategories.slice(0, 5);
  const balanceValues = Array.from(accountTotals.values());
  const recordedAssetsCents = balanceValues.reduce(
    (total, balanceCents) => total + Math.max(balanceCents, 0),
    0,
  );
  const recordedDebtCents = balanceValues.reduce(
    (total, balanceCents) => total + Math.abs(Math.min(balanceCents, 0)),
    0,
  );
  const recordedNetWorthCents = recordedAssetsCents - recordedDebtCents;
  const cashFlowTrend = calculateCashFlowTrend(
    transactions,
    monthKey,
    referenceDate,
    trendMonths,
    categoryDetails,
  );
  const rollingCashSurplus = calculateRollingCashSurplus(cashFlowTrend);

  return {
    balanceTrend: calculateBalanceTrend(accounts, transactions, monthKey, referenceDate, trendMonths),
    cashFlowTrend,
    categoryUsageChartData: calculateCategoryUsageChartData(
      allExpenseCategories,
      categoryDetails,
    ),
    monthlyExpensesCents,
    monthlyIncomeCents,
    netCashflowCents: monthlyIncomeCents - monthlyExpensesCents,
    recentTransactions: [...transactionsThroughReference]
      .sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`))
      .slice(0, 5),
    recordedAssetsCents,
    recordedDebtCents,
    recordedNetWorthCents,
    reviewQueue: {
      pendingCount: transactionsThroughReference.filter((transaction) => transaction.status === 'pending').length,
      uncategorizedCount: transactionsThroughReference.filter((transaction) => !transaction.categoryId).length,
    },
    rollingCashSurplus,
    spendingPace: calculateSpendingPace(transactions, referenceDate, categoryDetails),
    topExpenseCategories,
    totalBalanceCents: recordedNetWorthCents,
  };
}

function calculateCategoryUsageChartData(
  expenseCategories: TopExpenseCategory[],
  categoryDetails: Map<string, Category>,
): CategoryUsageChartItem[] {
  const positiveSpendingCents = expenseCategories.reduce(
    (total, category) => total + Math.max(category.amountCents, 0),
    0,
  );

  if (expenseCategories.length === 0) {
    return [];
  }

  const visibleCategories = expenseCategories.slice(0, 5);
  const remainingCategories = expenseCategories.slice(5);
  const otherSpendingCents = remainingCategories
    .reduce((total, category) => total + Math.max(category.amountCents, 0), 0);
  const otherRefundCents = remainingCategories
    .reduce((total, category) => total + Math.min(category.amountCents, 0), 0);
  const chartCategories = [
    ...visibleCategories,
    ...(otherSpendingCents > 0
      ? [{ amountCents: otherSpendingCents, categoryId: '__other_spending__', name: 'Other spending' }]
      : []),
    ...(otherRefundCents < 0
      ? [{ amountCents: otherRefundCents, categoryId: '__other_refunds__', name: 'Other refunds' }]
      : []),
  ];

  return chartCategories
    .sort(compareExpenseCategoryAmounts)
    .map((category, index) => ({
    ...category,
    color:
      (category.categoryId?.startsWith('__other')
        ? '#64748b'
        : category.categoryId ? categoryDetails.get(category.categoryId)?.color : '#64748b') ??
      FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length],
    percentage: category.amountCents > 0 && positiveSpendingCents > 0
      ? (category.amountCents / positiveSpendingCents) * 100
      : null,
    }));
}

function calculateExpenseCategories(
  transactions: Transaction[],
  categoryDetails: Map<string, Category>,
): TopExpenseCategory[] {
  const expenseTotals = new Map<string | null, number>();

  for (const transaction of transactions) {
    const category = transaction.categoryId ? categoryDetails.get(transaction.categoryId) : undefined;
    const isExpense = category?.type === 'expense'
      || (!category && transaction.amountCents < 0);

    if (!isExpense) {
      continue;
    }

    const categoryId = transaction.categoryId ?? null;
    expenseTotals.set(categoryId, (expenseTotals.get(categoryId) ?? 0) - transaction.amountCents);
  }

  return Array.from(expenseTotals.entries())
    .filter(([, amountCents]) => amountCents !== 0)
    .map(([categoryId, amountCents]) => ({
      amountCents,
      categoryId,
      name: categoryId ? categoryDetails.get(categoryId)?.name ?? 'Unknown category' : 'Uncategorized',
    }))
    .sort(compareExpenseCategoryAmounts);
}

function compareExpenseCategoryAmounts(
  a: Pick<TopExpenseCategory, 'amountCents' | 'name'>,
  b: Pick<TopExpenseCategory, 'amountCents' | 'name'>,
): number {
  const aIsPositive = a.amountCents > 0;
  const bIsPositive = b.amountCents > 0;

  if (aIsPositive !== bIsPositive) {
    return aIsPositive ? -1 : 1;
  }

  const amountComparison = aIsPositive
    ? b.amountCents - a.amountCents
    : a.amountCents - b.amountCents;
  return amountComparison || a.name.localeCompare(b.name);
}

function calculateCashFlowTrend(
  transactions: Transaction[],
  currentMonthKey: string,
  referenceDate: string,
  trendMonths: DashboardTrendMonths,
  categoryDetails: Map<string, Category>,
): MonthlyCashFlowPoint[] {
  return getMonthKeysEndingAt(currentMonthKey, trendMonths).map((monthKey) => {
    const endpoint = monthKey === currentMonthKey ? referenceDate : getMonthEndDate(monthKey);
    const monthlyTransactions = transactions.filter(
      (transaction) => isDateInMonth(transaction.date, monthKey)
        && transaction.date <= endpoint,
    );
    const { expenseCents, incomeCents } = calculateCashFlowTotals(monthlyTransactions, categoryDetails);

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
  categoryDetails: Map<string, Category>,
): SpendingPaceSummary {
  const currentMonthKey = getMonthKey(referenceDate);
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const currentMonthDays = getDaysInMonth(currentMonthKey);
  const previousMonthDays = getDaysInMonth(previousMonthKey);
  const referenceDay = Number(referenceDate.slice(8, 10));
  const pointCount = Math.max(currentMonthDays, previousMonthDays);
  const currentDailyTotals = getDailyExpenseTotals(transactions, currentMonthKey, categoryDetails);
  const previousDailyTotals = getDailyExpenseTotals(transactions, previousMonthKey, categoryDetails);
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

function getDailyExpenseTotals(
  transactions: Transaction[],
  monthKey: string,
  categoryDetails: Map<string, Category>,
): Map<number, number> {
  const totals = new Map<number, number>();

  for (const transaction of transactions) {
    if (!isDateInMonth(transaction.date, monthKey)) {
      continue;
    }

    const { expenseCents } = getCashFlowContribution(transaction, categoryDetails);
    if (expenseCents === 0) {
      continue;
    }

    const day = Number(transaction.date.slice(8, 10));
    totals.set(day, (totals.get(day) ?? 0) + expenseCents);
  }

  return totals;
}

function calculateCashFlowTotals(
  transactions: Transaction[],
  categoryDetails: Map<string, Category>,
): { expenseCents: number; incomeCents: number } {
  return transactions.reduce(
    (totals, transaction) => {
      const contribution = getCashFlowContribution(transaction, categoryDetails);
      totals.expenseCents += contribution.expenseCents;
      totals.incomeCents += contribution.incomeCents;
      return totals;
    },
    { expenseCents: 0, incomeCents: 0 },
  );
}

function getCashFlowContribution(
  transaction: Transaction,
  categoryDetails: Map<string, Category>,
): { expenseCents: number; incomeCents: number } {
  const categoryType = transaction.categoryId
    ? categoryDetails.get(transaction.categoryId)?.type
    : undefined;

  if (categoryType === 'transfer') {
    return { expenseCents: 0, incomeCents: 0 };
  }

  if (categoryType === 'expense') {
    return { expenseCents: -transaction.amountCents, incomeCents: 0 };
  }

  if (categoryType === 'income') {
    return { expenseCents: 0, incomeCents: transaction.amountCents };
  }

  return transaction.amountCents < 0
    ? { expenseCents: Math.abs(transaction.amountCents), incomeCents: 0 }
    : { expenseCents: 0, incomeCents: transaction.amountCents };
}

function calculateRollingCashSurplus(cashFlowTrend: MonthlyCashFlowPoint[]): RollingCashSurplus {
  const incomeCents = cashFlowTrend.reduce((total, point) => total + point.incomeCents, 0);
  const expenseCents = cashFlowTrend.reduce((total, point) => total + point.expenseCents, 0);
  const surplusCents = incomeCents - expenseCents;

  return {
    expenseCents,
    incomeCents,
    ratePercentage: incomeCents > 0 ? (surplusCents / incomeCents) * 100 : null,
    surplusCents,
  };
}
