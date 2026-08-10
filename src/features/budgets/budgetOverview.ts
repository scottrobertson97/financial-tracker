import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import type { Budget } from './budgetTypes';
import { getCurrentDateIso, getMonthKeysEndingAt } from '../../shared/dates';

export interface BudgetOverviewRow {
  actualCents: number;
  budgetCents: number | null;
  budgetId: string | null;
  categoryId: string;
  categoryName: string;
  color: string;
  historicalAverageCents: number;
  percentageUsed: number | null;
  remainingCents: number | null;
}

export interface UnbudgetedSpendingItem {
  amountCents: number;
  categoryId: string | null;
  categoryName: string;
}

export interface BudgetOverview {
  budgetedSpendingCents: number;
  month: string;
  overBudgetCategoryCount: number;
  percentageUsed: number | null;
  remainingCents: number;
  rows: BudgetOverviewRow[];
  totalBudgetCents: number;
  totalSpendingCents: number;
  unbudgetedSpendingCents: number;
  unbudgetedSpendingItems: UnbudgetedSpendingItem[];
}

interface CalculateBudgetOverviewInput {
  budgets: Budget[];
  categories: Category[];
  month: string;
  referenceDate?: string;
  transactions: Transaction[];
}

const FALLBACK_CATEGORY_COLOR = '#64748b';
const HISTORICAL_MONTH_COUNT = 6;

export function calculateBudgetOverview({
  budgets,
  categories,
  month,
  referenceDate = getCurrentDateIso(),
  transactions,
}: CalculateBudgetOverviewInput): BudgetOverview {
  const expenseCategories = categories
    .filter((category) => category.type === 'expense')
    .sort((a, b) => a.name.localeCompare(b.name));
  const expenseCategoryIds = new Set(expenseCategories.map((category) => category.id));
  const budgetsByCategory = new Map(
    budgets
      .filter((budget) => budget.month === month && expenseCategoryIds.has(budget.categoryId))
      .map((budget) => [budget.categoryId, budget]),
  );
  const currentSpendByCategory = calculateNetExpenseTotals(
    transactions,
    expenseCategoryIds,
    new Set([month]),
    referenceDate,
  );
  const historicalMonths = new Set(getMonthKeysEndingAt(month, HISTORICAL_MONTH_COUNT + 1).slice(0, -1));
  const historicalSpendByCategory = calculateNetExpenseTotals(
    transactions,
    expenseCategoryIds,
    historicalMonths,
    referenceDate,
  );

  const rows = expenseCategories.map<BudgetOverviewRow>((category) => {
    const budget = budgetsByCategory.get(category.id) ?? null;
    const actualCents = currentSpendByCategory.get(category.id) ?? 0;
    const budgetCents = budget?.amountCents ?? null;

    return {
      actualCents,
      budgetCents,
      budgetId: budget?.id ?? null,
      categoryId: category.id,
      categoryName: category.name,
      color: category.color ?? FALLBACK_CATEGORY_COLOR,
      historicalAverageCents: Math.round((historicalSpendByCategory.get(category.id) ?? 0) / HISTORICAL_MONTH_COUNT),
      percentageUsed: budgetCents === null ? null : (actualCents / budgetCents) * 100,
      remainingCents: budgetCents === null ? null : budgetCents - actualCents,
    };
  });

  const uncategorizedSpendingCents = transactions
    .filter((transaction) => (
      transaction.date.startsWith(`${month}-`)
      && transaction.date <= referenceDate
      && !transaction.categoryId
      && transaction.amountCents < 0
    ))
    .reduce((total, transaction) => total + Math.abs(transaction.amountCents), 0);
  const unbudgetedSpendingItems: UnbudgetedSpendingItem[] = rows
    .filter((row) => row.budgetCents === null && row.actualCents > 0)
    .map((row) => ({
      amountCents: row.actualCents,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
    }));

  if (uncategorizedSpendingCents > 0) {
    unbudgetedSpendingItems.push({
      amountCents: uncategorizedSpendingCents,
      categoryId: null,
      categoryName: 'Uncategorized',
    });
  }

  unbudgetedSpendingItems.sort((a, b) => b.amountCents - a.amountCents || a.categoryName.localeCompare(b.categoryName));

  const budgetedRows = rows.filter((row) => row.budgetCents !== null);
  const totalBudgetCents = budgetedRows.reduce((total, row) => total + (row.budgetCents ?? 0), 0);
  const budgetedSpendingCents = budgetedRows.reduce((total, row) => total + row.actualCents, 0);
  const unbudgetedSpendingCents = unbudgetedSpendingItems.reduce((total, item) => total + item.amountCents, 0);

  return {
    budgetedSpendingCents,
    month,
    overBudgetCategoryCount: budgetedRows.filter((row) => (row.remainingCents ?? 0) < 0).length,
    percentageUsed: totalBudgetCents > 0 ? (budgetedSpendingCents / totalBudgetCents) * 100 : null,
    remainingCents: totalBudgetCents - budgetedSpendingCents,
    rows,
    totalBudgetCents,
    totalSpendingCents: budgetedSpendingCents + unbudgetedSpendingCents,
    unbudgetedSpendingCents,
    unbudgetedSpendingItems,
  };
}

function calculateNetExpenseTotals(
  transactions: Transaction[],
  expenseCategoryIds: Set<string>,
  months: Set<string>,
  dateTo: string | null = null,
): Map<string, number> {
  const signedTotals = new Map<string, number>();

  for (const transaction of transactions) {
    if (
      !transaction.categoryId
      || !expenseCategoryIds.has(transaction.categoryId)
      || !months.has(transaction.date.slice(0, 7))
      || (dateTo !== null && transaction.date > dateTo)
    ) {
      continue;
    }

    signedTotals.set(
      transaction.categoryId,
      (signedTotals.get(transaction.categoryId) ?? 0) - transaction.amountCents,
    );
  }

  return new Map(
    Array.from(signedTotals.entries()).map(([categoryId, amountCents]) => [categoryId, Math.max(0, amountCents)]),
  );
}
