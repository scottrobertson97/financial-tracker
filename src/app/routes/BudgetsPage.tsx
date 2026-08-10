import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import type { Budget } from '../../features/budgets/budgetTypes';
import { BudgetCategoryTable } from '../../features/budgets/BudgetCategoryTable';
import { BudgetComparisonChart } from '../../features/budgets/BudgetComparisonChart';
import { calculateBudgetOverview, type BudgetOverview } from '../../features/budgets/budgetOverview';
import type { Category } from '../../features/categories/categoryTypes';
import type { Transaction } from '../../features/transactions/transactionTypes';
import { formatMonthLabel, getCurrentDateIso, getCurrentMonthKey } from '../../shared/dates';
import { formatCurrency } from '../../shared/money';

export function BudgetsPage() {
  const { budgets: budgetService, categories: categoryService, transactions: transactionService } = useAppServices();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthKey());
  const selectedMonthRef = useRef(selectedMonth);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const referenceDate = useMemo(() => getCurrentDateIso(), []);
  const overview = useMemo(
    () => calculateBudgetOverview({ budgets, categories, month: selectedMonth, referenceDate, transactions }),
    [budgets, categories, referenceDate, selectedMonth, transactions],
  );
  const monthLabel = formatMonthLabel(selectedMonth);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setPageError(null);

    Promise.all([
      budgetService.listForMonth(selectedMonth),
      categoryService.list(),
      transactionService.list(),
    ]).then(([nextBudgets, nextCategories, nextTransactions]) => {
      if (!isCurrent) return;
      setBudgets(nextBudgets);
      setCategories(nextCategories);
      setTransactions(nextTransactions);
    }).catch((error: unknown) => {
      if (isCurrent) {
        setPageError(error instanceof Error ? error.message : 'Unable to load budgets.');
      }
    }).finally(() => {
      if (isCurrent) setIsLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [budgetService, categoryService, selectedMonth, transactionService]);

  async function handleSave(categoryId: string, amountCents: number) {
    const mutationMonth = selectedMonth;
    setPageError(null);
    const savedBudget = await budgetService.upsert({ amountCents, categoryId, month: mutationMonth });
    if (selectedMonthRef.current !== mutationMonth) return;

    setBudgets((current) => [
      ...current.filter((budget) => budget.categoryId !== categoryId),
      savedBudget,
    ]);
  }

  async function handleDelete(categoryId: string) {
    const mutationMonth = selectedMonth;
    setPageError(null);
    await budgetService.delete(categoryId, mutationMonth);
    if (selectedMonthRef.current !== mutationMonth) return;

    setBudgets((current) => current.filter((budget) => budget.categoryId !== categoryId));
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Budgets"
        eyebrow="Plan spending"
        description="Set monthly limits by expense category and compare them with your recorded spending."
      />

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-ledger-line bg-ledger-panel p-4">
        <div>
          <h2 className="text-sm font-semibold">Budget month</h2>
          <p className="mt-1 text-sm text-ledger-muted">Pending transactions count, while transfers do not.</p>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Month</span>
          <input
            className="rounded-md border border-ledger-line px-3 py-2"
            onChange={(event) => {
              if (event.target.value) {
                selectedMonthRef.current = event.target.value;
                setSelectedMonth(event.target.value);
              }
            }}
            type="month"
            value={selectedMonth}
          />
        </label>
      </div>

      {pageError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss" role="alert">
          {pageError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={`${monthLabel} budget summary`}>
        <SummaryCard
          detail={overview.percentageUsed === null ? 'No category budgets yet' : `${overview.percentageUsed.toFixed(1)}% used`}
          label="Monthly budget"
          value={formatCurrency(overview.totalBudgetCents)}
        />
        <SummaryCard
          detail="Budgeted and unbudgeted expenses"
          label="Total spending"
          value={formatCurrency(overview.totalSpendingCents)}
        />
        <SummaryCard
          detail="Across budgeted categories"
          label="Budget remaining"
          tone={overview.remainingCents < 0 ? 'loss' : 'default'}
          value={formatCurrency(overview.remainingCents)}
        />
        <SummaryCard
          detail="Spending without a category budget"
          label="Unbudgeted spending"
          tone={overview.unbudgetedSpendingCents > 0 ? 'loss' : 'default'}
          value={formatCurrency(overview.unbudgetedSpendingCents)}
        />
      </div>

      <BudgetTakeaway monthLabel={monthLabel} overview={overview} />

      <section className="rounded-md border border-ledger-line bg-ledger-panel p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Budget vs. actual</h2>
          <p className="mt-1 text-sm text-ledger-muted">Net expense spending after refunds, compared with each category plan.</p>
        </div>
        {isLoading ? (
          <p className="text-sm text-ledger-muted">Loading budgets...</p>
        ) : (
          <BudgetComparisonChart monthLabel={monthLabel} rows={overview.rows} />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Category budgets</h2>
          <p className="mt-1 text-sm text-ledger-muted">
            Six-month averages use the six calendar months before {monthLabel}, including months with no spending.
          </p>
        </div>
        {isLoading ? (
          <p className="text-sm text-ledger-muted">Loading expense categories...</p>
        ) : (
          <BudgetCategoryTable
            month={selectedMonth}
            onDelete={handleDelete}
            onSave={handleSave}
            rows={overview.rows}
          />
        )}
      </section>

      {!isLoading && overview.unbudgetedSpendingItems.length > 0 ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold">Where unbudgeted spending went</h2>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {overview.unbudgetedSpendingItems.map((item) => (
              <div key={item.categoryId ?? 'uncategorized'} className="flex justify-between gap-3">
                <span>{item.categoryName}</span>
                <span className="font-medium">{formatCurrency(item.amountCents)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SummaryCard({
  detail,
  label,
  tone = 'default',
  value,
}: {
  detail: string;
  label: string;
  tone?: 'default' | 'loss';
  value: string;
}) {
  return (
    <div className="rounded-md border border-ledger-line bg-ledger-panel p-4">
      <p className="text-sm text-ledger-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === 'loss' ? 'text-ledger-loss' : ''}`}>{value}</p>
      <p className="mt-1 text-xs text-ledger-muted">{detail}</p>
    </div>
  );
}

function BudgetTakeaway({ monthLabel, overview }: { monthLabel: string; overview: BudgetOverview }) {
  let message: string;

  if (overview.rows.length === 0) {
    message = 'Create an expense category to start planning monthly spending.';
  } else if (overview.totalBudgetCents === 0) {
    message = 'Set your first category budget below. Six-month averages provide a starting point where history is available.';
  } else if (overview.overBudgetCategoryCount > 0) {
    const categoryWord = overview.overBudgetCategoryCount === 1 ? 'category is' : 'categories are';
    message = `${overview.overBudgetCategoryCount} ${categoryWord} over budget. Review the negative remaining amounts and adjust spending or the plan.`;
  } else if (overview.unbudgetedSpendingCents > 0) {
    message = `${formatCurrency(overview.unbudgetedSpendingCents)} of spending is outside your category budgets. Add plans for the items listed below.`;
  } else if (overview.totalSpendingCents === 0) {
    message = `No expense spending is recorded for ${monthLabel} yet.`;
  } else {
    message = `Budgeted spending is at ${(overview.percentageUsed ?? 0).toFixed(1)}%, with ${formatCurrency(overview.remainingCents)} remaining.`;
  }

  return (
    <aside className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3" aria-label="Budget takeaway">
      <p className="text-xs font-semibold uppercase tracking-wide text-ledger-accent">Takeaway</p>
      <p className="mt-1 text-sm text-ledger-ink">{message}</p>
    </aside>
  );
}
