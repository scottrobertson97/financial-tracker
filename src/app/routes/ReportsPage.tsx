import { useEffect, useMemo, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import { CashSurplusRateChart } from '../../features/reports/CashSurplusRateChart';
import { CategoryChangeChart } from '../../features/reports/CategoryChangeChart';
import { CategorySpendingTrendChart } from '../../features/reports/CategorySpendingTrendChart';
import {
  calculateReportSummary,
  type ReportRangeMonths,
} from '../../features/reports/reportService';
import type { Category } from '../../features/categories/categoryTypes';
import type { Transaction } from '../../features/transactions/transactionTypes';
import { getCurrentDateIso } from '../../shared/dates';
import { formatCurrency } from '../../shared/money';

export function ReportsPage() {
  const { categories: categoryService, transactions: transactionService } = useAppServices();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rangeMonths, setRangeMonths] = useState<ReportRangeMonths>(6);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const referenceDate = useMemo(() => getCurrentDateIso(), []);
  const summary = useMemo(
    () => calculateReportSummary({ categories, months: rangeMonths, referenceDate, transactions }),
    [categories, rangeMonths, referenceDate, transactions],
  );
  const latestSurplus = summary.cashSurplusTrend.at(-1);

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    setIsLoading(true);
    setPageError(null);
    try {
      const [nextCategories, nextTransactions] = await Promise.all([
        categoryService.list(),
        transactionService.list(),
      ]);
      setCategories(nextCategories);
      setTransactions(nextTransactions);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load reports.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="min-w-0 space-y-6">
      <PageHeader
        title="Reports"
        eyebrow="Understand"
        description="See where money goes, how much income remains, and which entries need attention. Transfers are excluded and expense refunds reduce spending."
      />

      {pageError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss" role="alert">
          {pageError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ledger-line py-3">
        <div>
          <h2 className="text-sm font-semibold">Reporting period</h2>
          <p className="text-sm text-ledger-muted">Current month runs through {referenceDate}.</p>
        </div>
        <div aria-label="Reporting period" className="inline-flex rounded-md border border-ledger-line bg-ledger-panel p-1" role="group">
          {([6, 12] as const).map((months) => (
            <button
              key={months}
              aria-pressed={rangeMonths === months}
              className={`min-w-24 rounded px-3 py-1.5 text-sm font-medium transition ${
                rangeMonths === months
                  ? 'bg-ledger-ink text-white'
                  : 'text-ledger-muted hover:bg-slate-100 hover:text-ledger-ink'
              }`}
              onClick={() => setRangeMonths(months)}
              type="button"
            >
              {months} months
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid min-h-64 place-items-center rounded-md border border-ledger-line bg-ledger-panel text-sm text-ledger-muted" role="status">
          Loading reports...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              detail={`${formatCurrency(summary.periodTotals.incomeCents)} income / ${formatCurrency(summary.periodTotals.expenseCents)} expenses`}
              label={`${rangeMonths}-month surplus`}
              tone={summary.periodTotals.surplusCents >= 0 ? 'gain' : 'loss'}
              value={formatCurrency(summary.periodTotals.surplusCents)}
            />
            <MetricCard
              detail="Income remaining after expenses"
              label="This month's surplus rate"
              tone={latestSurplus?.surplusRate == null
                ? 'neutral'
                : latestSurplus.surplusRate >= 0 ? 'gain' : 'loss'}
              value={latestSurplus?.surplusRate === null || latestSurplus === undefined
                ? 'Not available'
                : formatPercent(latestSurplus.surplusRate)}
            />
            <MetricCard
              detail={`${summary.reviewCounts.uncategorizedCount} uncategorized / ${summary.reviewCounts.pendingCount} pending`}
              label="Entries needing review"
              tone={summary.reviewCounts.needsReviewCount > 0 ? 'loss' : 'neutral'}
              value={String(summary.reviewCounts.needsReviewCount)}
            />
            <MetricCard
              detail={summary.largestTransaction
                ? `${summary.largestTransaction.description} / ${summary.largestTransaction.date}`
                : 'No non-transfer entries in this period'}
              label="Largest transaction"
              tone={summary.largestTransaction?.amountCents && summary.largestTransaction.amountCents < 0 ? 'loss' : 'neutral'}
              value={summary.largestTransaction ? formatCurrency(summary.largestTransaction.amountCents) : 'Not available'}
            />
          </div>

          <section className="rounded-md border border-ledger-line bg-ledger-panel p-4">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Spending mix over time</h2>
              <p className="mt-1 text-sm text-ledger-muted">
                Net monthly spending for the five largest categories, with remaining categories grouped as Other.
              </p>
            </div>
            <CategorySpendingTrendChart data={summary.categorySpendingTrend} />
          </section>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
              <div className="mb-4">
                <h2 className="text-base font-semibold">Cash surplus rate</h2>
                <p className="mt-1 text-sm text-ledger-muted">
                  The share of income left after expenses. Months without positive income have no rate.
                </p>
              </div>
              <CashSurplusRateChart data={summary.cashSurplusTrend} />
            </section>

            <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
              <div className="mb-4">
                <h2 className="text-base font-semibold">What changed this month</h2>
                <p className="mt-1 text-sm text-ledger-muted">
                  Category spending compared through the same day of last month. Positive bars mean more; negative bars mean less.
                </p>
              </div>
              <CategoryChangeChart data={summary.categoryChanges} />
            </section>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4 lg:col-span-2">
              <h2 className="text-base font-semibold">Top expense merchants</h2>
              <p className="mt-1 text-sm text-ledger-muted">Net spending after merchant refunds during the selected period.</p>
              {summary.topExpenseMerchants.length === 0 ? (
                <p className="mt-6 text-sm text-ledger-muted">No expense transactions with merchants are available.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <caption className="sr-only">Top expense merchants in the selected period</caption>
                    <thead>
                      <tr className="border-b border-ledger-line text-ledger-muted">
                        <th className="py-2 pr-3 font-medium" scope="col">Merchant</th>
                        <th className="px-3 py-2 text-right font-medium" scope="col">Entries</th>
                        <th className="py-2 pl-3 text-right font-medium" scope="col">Net spending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topExpenseMerchants.map((merchant) => (
                        <tr className="border-b border-ledger-line last:border-0" key={merchant.merchant.toLocaleLowerCase()}>
                          <th className="py-3 pr-3 font-medium" scope="row">{merchant.merchant}</th>
                          <td className="px-3 py-3 text-right text-ledger-muted">{merchant.transactionCount}</td>
                          <td className="py-3 pl-3 text-right font-semibold">{formatCurrency(merchant.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="min-w-0 rounded-md border border-ledger-line bg-ledger-panel p-4">
              <h2 className="text-base font-semibold">Review queue</h2>
              <p className="mt-1 text-sm text-ledger-muted">Counts are de-duplicated in the total.</p>
              <dl className="mt-5 space-y-4">
                <ReviewCount
                  count={summary.reviewCounts.uncategorizedCount}
                  description="Missing a category"
                  label="Uncategorized"
                />
                <ReviewCount
                  count={summary.reviewCounts.pendingCount}
                  description="Not yet cleared"
                  label="Pending"
                />
                <ReviewCount
                  count={summary.reviewCounts.needsReviewCount}
                  description="Unique entries to check"
                  label="Total needing review"
                />
              </dl>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: 'gain' | 'loss' | 'neutral';
  value: string;
}) {
  const valueClass = tone === 'gain'
    ? 'text-ledger-gain'
    : tone === 'loss'
      ? 'text-ledger-loss'
      : 'text-ledger-ink';

  return (
    <div className="rounded-md border border-ledger-line bg-ledger-panel p-4">
      <p className="text-sm text-ledger-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-ledger-muted">{detail}</p>
    </div>
  );
}

function ReviewCount({ count, description, label }: { count: number; description: string; label: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ledger-line pb-4 last:border-0 last:pb-0">
      <dt>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ledger-muted">{description}</span>
      </dt>
      <dd className="text-xl font-semibold">{count}</dd>
    </div>
  );
}

function formatPercent(rate: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, style: 'percent' }).format(rate);
}
