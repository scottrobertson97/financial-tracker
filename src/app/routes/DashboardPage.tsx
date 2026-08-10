import { useEffect, useMemo, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import type { Account } from '../../features/accounts/accountTypes';
import type { Category } from '../../features/categories/categoryTypes';
import { BalanceTrendChart } from '../../features/dashboard/BalanceTrendChart';
import { CashFlowTrendChart } from '../../features/dashboard/CashFlowTrendChart';
import { CategoryUsageChart } from '../../features/dashboard/CategoryUsageChart';
import {
  calculateDashboardSummary,
  type DashboardSummary,
  type DashboardTrendMonths,
} from '../../features/dashboard/dashboardService';
import { SpendingPaceChart } from '../../features/dashboard/SpendingPaceChart';
import type { Transaction } from '../../features/transactions/transactionTypes';
import { getCurrentDateIso } from '../../shared/dates';
import { formatCurrency } from '../../shared/money';

export function DashboardPage() {
  const { accounts: accountService, categories: categoryService, transactions: transactionService } = useAppServices();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [trendMonths, setTrendMonths] = useState<DashboardTrendMonths>(6);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const referenceDate = useMemo(() => getCurrentDateIso(), []);
  const summary = useMemo<DashboardSummary>(
    () => calculateDashboardSummary({ accounts, categories, referenceDate, transactions, trendMonths }),
    [accounts, categories, referenceDate, transactions, trendMonths],
  );
  const accountNames = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const positiveCategorySpendingCents = summary.categoryUsageChartData.reduce(
    (total, category) => total + Math.max(category.amountCents, 0),
    0,
  );
  const financialPositionCards = [
    {
      detail: 'Positive recorded account balances',
      label: 'Recorded assets',
      tone: 'text-ledger-ink',
      value: formatCurrency(summary.recordedAssetsCents),
    },
    {
      detail: 'Absolute value of negative balances',
      label: 'Recorded debt',
      tone: summary.recordedDebtCents > 0 ? 'text-ledger-loss' : 'text-ledger-ink',
      value: formatCurrency(summary.recordedDebtCents),
    },
    {
      detail: 'Recorded assets minus recorded debt',
      label: 'Recorded net worth',
      tone: summary.recordedNetWorthCents < 0 ? 'text-ledger-loss' : 'text-ledger-ink',
      value: formatCurrency(summary.recordedNetWorthCents),
    },
    {
      detail: summary.rollingCashSurplus.ratePercentage === null
        ? 'No recorded income in this range'
        : `${formatCurrency(Math.abs(summary.rollingCashSurplus.surplusCents))} ${
          summary.rollingCashSurplus.surplusCents < 0 ? 'deficit' : 'surplus'
        } across the range`,
      label: `${trendMonths}-month cash-surplus rate`,
      tone: summary.rollingCashSurplus.ratePercentage !== null
        && summary.rollingCashSurplus.ratePercentage < 0
        ? 'text-ledger-loss'
        : 'text-ledger-ink',
      value: summary.rollingCashSurplus.ratePercentage === null
        ? 'Not available'
        : `${summary.rollingCashSurplus.ratePercentage.toFixed(1)}%`,
    },
  ] as const;
  const monthlyCards = [
    { label: 'Income this month', value: formatCurrency(summary.monthlyIncomeCents) },
    { label: 'Net spending this month', value: formatCurrency(summary.monthlyExpensesCents) },
    { label: 'Net cashflow this month', value: formatCurrency(summary.netCashflowCents) },
  ] as const;

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setIsLoading(true);
    setPageError(null);
    try {
      const [nextAccounts, nextCategories, nextTransactions] = await Promise.all([
        accountService.list(),
        categoryService.list(),
        transactionService.list(),
      ]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setTransactions(nextTransactions);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <PageHeader
        title="Dashboard"
        eyebrow="Review"
        description="Review your recorded financial position, cashflow, spending, and items that need attention."
      />
      {pageError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss">{pageError}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {financialPositionCards.map((card) => (
          <div key={card.label} className="rounded-md border border-ledger-line bg-ledger-panel p-4">
            <p className="text-sm text-ledger-muted">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
            <p className="mt-1 text-xs text-ledger-muted">{card.detail}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {monthlyCards.map((card) => (
          <div key={card.label} className="rounded-md border border-ledger-line bg-ledger-panel p-4">
            <p className="text-sm text-ledger-muted">{card.label}</p>
            <p className="mt-2 text-xl font-semibold">{card.value}</p>
          </div>
        ))}
        <section aria-labelledby="review-queue-heading" className="rounded-md border border-ledger-line bg-ledger-panel p-4">
          <h2 id="review-queue-heading" className="text-sm text-ledger-muted">Review queue</h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <p><span className="text-xl font-semibold">{summary.reviewQueue.uncategorizedCount}</span><br /><span className="text-xs text-ledger-muted">Uncategorized</span></p>
            <p><span className="text-xl font-semibold">{summary.reviewQueue.pendingCount}</span><br /><span className="text-xs text-ledger-muted">Pending</span></p>
          </div>
          <p className="mt-1 text-xs text-ledger-muted">Counts can overlap.</p>
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ledger-line py-3">
        <div>
          <h2 className="text-sm font-semibold">Trend range</h2>
          <p className="text-sm text-ledger-muted">Applies to cashflow and balance history.</p>
        </div>
        <div aria-label="Trend range" className="inline-flex rounded-md border border-ledger-line bg-ledger-panel p-1" role="group">
          {([6, 12] as const).map((months) => (
            <button
              key={months}
              aria-pressed={trendMonths === months}
              className={`min-w-24 rounded px-3 py-1.5 text-sm font-medium transition ${
                trendMonths === months ? 'bg-ledger-ink text-white' : 'text-ledger-muted hover:bg-slate-100 hover:text-ledger-ink'
              }`}
              onClick={() => setTrendMonths(months)}
              type="button"
            >
              {months} months
            </button>
          ))}
        </div>
      </div>
      <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Monthly cashflow</h2>
          <p className="mt-1 text-sm text-ledger-muted">Income, expenses, and net movement across the selected range.</p>
        </div>
        {isLoading ? <p className="text-sm text-ledger-muted">Loading...</p> : <CashFlowTrendChart data={summary.cashFlowTrend} />}
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Total balance trend</h2>
            <p className="mt-1 text-sm text-ledger-muted">Recorded month-end balances through today.</p>
          </div>
          {isLoading ? <p className="text-sm text-ledger-muted">Loading...</p> : <BalanceTrendChart data={summary.balanceTrend} />}
        </section>
        <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Spending pace</h2>
            <p className="mt-1 text-sm text-ledger-muted">Cumulative expenses compared with last month.</p>
          </div>
          {isLoading ? <p className="text-sm text-ledger-muted">Loading...</p> : <SpendingPaceChart data={summary.spendingPace} />}
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
          <h2 className="text-base font-semibold">Net spending by category</h2>
          {isLoading ? <p className="mt-3 text-sm text-ledger-muted">Loading...</p> : null}
          {!isLoading ? (
            <div className="mt-4">
              <CategoryUsageChart
                data={summary.categoryUsageChartData}
                positiveSpendingCents={positiveCategorySpendingCents}
              />
            </div>
          ) : null}
          {summary.topExpenseCategories.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-ledger-line pt-4">
              {summary.topExpenseCategories.map((category) => (
                <div key={category.categoryId ?? 'uncategorized'} className="flex items-center justify-between gap-3 text-sm">
                  <span>{category.name}</span>
                  <span className="font-medium">{formatCurrency(category.amountCents)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
          <h2 className="text-base font-semibold">Recent transactions</h2>
          {isLoading ? <p className="mt-3 text-sm text-ledger-muted">Loading...</p> : null}
          {!isLoading && summary.recentTransactions.length === 0 ? (
            <p className="mt-3 text-sm text-ledger-muted">No transactions recorded yet.</p>
          ) : null}
          <div className="mt-3 space-y-3">
            {summary.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-start justify-between gap-3 border-b border-ledger-line pb-3 text-sm last:border-b-0 last:pb-0">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-ledger-muted">
                    {transaction.date} · {accountNames.get(transaction.accountId) ?? 'Unknown account'} ·{' '}
                    {transaction.categoryId ? categoryNames.get(transaction.categoryId) ?? 'Unknown category' : 'Uncategorized'}
                  </p>
                </div>
                <p className={transaction.amountCents < 0 ? 'font-medium text-ledger-loss' : 'font-medium text-ledger-gain'}>
                  {formatCurrency(transaction.amountCents)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
