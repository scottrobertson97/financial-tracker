import { useEffect, useMemo, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import type { Account } from '../../features/accounts/accountTypes';
import type { Category } from '../../features/categories/categoryTypes';
import { CategoryUsageChart } from '../../features/dashboard/CategoryUsageChart';
import { calculateDashboardSummary, type DashboardSummary } from '../../features/dashboard/dashboardService';
import type { Transaction } from '../../features/transactions/transactionTypes';
import { formatCurrency } from '../../shared/money';

export function DashboardPage() {
  const { accounts: accountService, categories: categoryService, transactions: transactionService } = useAppServices();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const summary = useMemo<DashboardSummary>(
    () => calculateDashboardSummary({ accounts, categories, transactions }),
    [accounts, categories, transactions],
  );
  const accountNames = useMemo(() => new Map(accounts.map((account) => [account.id, account.name])), [accounts]);
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const summaryCards = [
    { label: 'Total balance', value: formatCurrency(summary.totalBalanceCents) },
    { label: 'Income this month', value: formatCurrency(summary.monthlyIncomeCents) },
    { label: 'Expenses this month', value: formatCurrency(summary.monthlyExpensesCents) },
    { label: 'Net cashflow', value: formatCurrency(summary.netCashflowCents) },
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
    <section className="space-y-6">
      <PageHeader
        title="Dashboard"
        eyebrow="Review"
        description="A current-month summary of balances, cashflow, spending categories, and recent ledger activity."
      />
      {pageError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss">{pageError}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-md border border-ledger-line bg-ledger-panel p-4">
            <p className="text-sm text-ledger-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-ledger-line bg-ledger-panel p-4">
          <h2 className="text-base font-semibold">Expense usage by category</h2>
          {isLoading ? <p className="mt-3 text-sm text-ledger-muted">Loading...</p> : null}
          {!isLoading && summary.topExpenseCategories.length === 0 ? (
            <p className="mt-3 text-sm text-ledger-muted">No expenses recorded for the current month.</p>
          ) : null}
          {!isLoading ? (
            <div className="mt-4">
              <CategoryUsageChart
                data={summary.categoryUsageChartData}
                totalExpensesCents={summary.monthlyExpensesCents}
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
        <section className="rounded-md border border-ledger-line bg-ledger-panel p-4">
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
