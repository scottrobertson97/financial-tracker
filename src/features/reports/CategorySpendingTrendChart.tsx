import { useEffect, useMemo, useRef } from 'react';
import { Chart } from '../dashboard/chartSetup';
import { formatCurrency } from '../../shared/money';
import type { CategorySpendingTrend } from './reportService';
import { ReportTableDisclosure } from './ReportTableDisclosure';

interface CategorySpendingTrendChartProps {
  data: CategorySpendingTrend;
}

export function CategorySpendingTrendChart({ data }: CategorySpendingTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'bar', number[], string> | null>(null);
  const hasActivity = data.series.length > 0;
  const hasNetData = data.series.some((series) => series.monthlyCents.some((value) => value !== 0));
  const monthlyTotals = useMemo(
    () => data.months.map((_, monthIndex) =>
      data.series.reduce((total, series) => total + series.monthlyCents[monthIndex], 0)),
    [data],
  );
  const leadingCategory = data.series.find(
    (series) => series.categoryId !== '__other__' && series.totalCents > 0,
  );
  const positiveNetSpendingCents = data.series.reduce(
    (total, series) => total + Math.max(series.totalCents, 0),
    0,
  );

  useEffect(() => {
    if (!canvasRef.current || !hasNetData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.months.map((month) => month.label),
        datasets: data.series.map((series) => ({
          backgroundColor: series.color,
          borderWidth: 0,
          data: series.monthlyCents,
          label: series.name,
        })),
      },
      options: {
        animation: false,
        interaction: { intersect: false, mode: 'index' },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { boxHeight: 10, boxWidth: 10, usePointStyle: true },
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              footer(items) {
                const total = items.reduce((sum, item) => sum + (item.parsed.y ?? 0), 0);
                return `Net spending: ${formatCurrency(total)}`;
              },
              label(context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y ?? 0)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            stacked: true,
            ticks: { maxRotation: 0, minRotation: 0 },
          },
          y: {
            stacked: true,
            ticks: {
              callback(value) {
                return formatCurrency(Number(value));
              },
              maxTicksLimit: 6,
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, hasNetData]);

  if (!hasActivity) {
    return <ChartEmptyState>No expense activity was recorded in this period.</ChartEmptyState>;
  }

  const share = leadingCategory && positiveNetSpendingCents > 0
    ? leadingCategory.totalCents / positiveNetSpendingCents
    : null;

  return (
    <div className="min-w-0 space-y-4">
      {leadingCategory ? (
        <p className="text-sm leading-6 text-ledger-muted">
          <span className="font-semibold text-ledger-ink">{leadingCategory.name}</span> led net spending at{' '}
          <span className="font-semibold text-ledger-ink">{formatCurrency(leadingCategory.totalCents)}</span>
          {share === null ? '.' : `, ${formatPercent(share)} of positive net category spending.`}
          {data.totalCents < positiveNetSpendingCents
            ? ` Refunds reduced overall net spending to ${formatCurrency(data.totalCents)}.`
            : null}
        </p>
      ) : (
        <p className="text-sm leading-6 text-ledger-muted">
          Expense activity netted to <span className="font-semibold text-ledger-ink">{formatCurrency(data.totalCents)}</span> after refunds.
        </p>
      )}
      {hasNetData ? (
        <div className="relative h-80 min-w-0 w-full">
          <canvas
            ref={canvasRef}
            aria-label="Monthly net spending stacked by expense category"
            className="max-w-full"
            role="img"
          />
        </div>
      ) : (
        <ChartEmptyState>No net spending remains to chart after refunds.</ChartEmptyState>
      )}
      <ReportTableDisclosure label="Show exact monthly spending">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Monthly net spending by category</caption>
          <thead>
            <tr className="border-b border-ledger-line">
              <th className="px-2 py-2 font-semibold" scope="col">Month</th>
              {data.series.map((series) => (
                <th className="px-2 py-2 text-right font-semibold" key={series.categoryId ?? 'uncategorized'} scope="col">
                  {series.name}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold" scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((month, monthIndex) => (
              <tr className="border-b border-ledger-line last:border-0" key={month.monthKey}>
                <th className="whitespace-nowrap px-2 py-2 font-medium" scope="row">{month.label}</th>
                {data.series.map((series) => (
                  <td className="whitespace-nowrap px-2 py-2 text-right" key={series.categoryId ?? 'uncategorized'}>
                    {formatCurrency(series.monthlyCents[monthIndex])}
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-2 text-right font-medium">
                  {formatCurrency(monthlyTotals[monthIndex])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTableDisclosure>
    </div>
  );
}

function formatPercent(rate: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, style: 'percent' }).format(rate);
}

function ChartEmptyState({ children }: { children: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
      {children}
    </div>
  );
}
