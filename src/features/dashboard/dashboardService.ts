import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import { getCurrentMonthKey, isDateInMonth } from '../../shared/dates';

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

export interface DashboardSummary {
  categoryUsageChartData: CategoryUsageChartItem[];
  monthlyExpensesCents: number;
  monthlyIncomeCents: number;
  netCashflowCents: number;
  recentTransactions: Transaction[];
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
  monthKey?: string;
  transactions: Transaction[];
}

export function calculateDashboardSummary({
  accounts,
  categories,
  monthKey = getCurrentMonthKey(),
  transactions,
}: CalculateDashboardInput): DashboardSummary {
  const categoryDetails = new Map(categories.map((category) => [category.id, category]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const accountTotals = new Map(accounts.map((account) => [account.id, account.startingBalanceCents]));

  for (const transaction of transactions) {
    accountTotals.set(
      transaction.accountId,
      (accountTotals.get(transaction.accountId) ?? 0) + transaction.amountCents,
    );
  }

  const monthlyTransactions = transactions.filter((transaction) => isDateInMonth(transaction.date, monthKey));
  const monthlyIncomeCents = monthlyTransactions
    .filter((transaction) => transaction.amountCents > 0)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const monthlyExpenseTotal = monthlyTransactions
    .filter((transaction) => transaction.amountCents < 0)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const monthlyExpensesCents = Math.abs(monthlyExpenseTotal);
  const topExpenseCategories = calculateTopExpenseCategories(monthlyTransactions, categoryNames);

  return {
    categoryUsageChartData: calculateCategoryUsageChartData(
      topExpenseCategories,
      monthlyExpensesCents,
      categoryDetails,
    ),
    monthlyExpensesCents,
    monthlyIncomeCents,
    netCashflowCents: monthlyIncomeCents + monthlyExpenseTotal,
    recentTransactions: [...transactions]
      .sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`))
      .slice(0, 5),
    topExpenseCategories,
    totalBalanceCents: Array.from(accountTotals.values()).reduce((total, amount) => total + amount, 0),
  };
}

function calculateCategoryUsageChartData(
  topExpenseCategories: TopExpenseCategory[],
  totalExpensesCents: number,
  categoryDetails: Map<string, Category>,
): CategoryUsageChartItem[] {
  if (totalExpensesCents === 0) {
    return [];
  }

  return topExpenseCategories.map((category, index) => ({
    ...category,
    color:
      (category.categoryId ? categoryDetails.get(category.categoryId)?.color : '#64748b') ??
      FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length],
    percentage: (category.amountCents / totalExpensesCents) * 100,
  }));
}

function calculateTopExpenseCategories(
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
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 5);
}
