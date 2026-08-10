import { useEffect, useRef, useState } from 'react';
import type { BudgetOverviewRow } from './budgetOverview';
import { Chart } from '../dashboard/chartSetup';
import { formatCurrency } from '../../shared/money';

interface BudgetComparisonChartProps {
  monthLabel: string;
  rows: BudgetOverviewRow[];
}

export function BudgetComparisonChart({ monthLabel, rows }: BudgetComparisonChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'bar', number[], string> | null>(null);
  const [showData, setShowData] = useState(false);
  const budgetedRows = rows.filter((row): row is BudgetOverviewRow & { budgetCents: number } => row.budgetCents !== null);

  useEffect(() => {
    if (!canvasRef.current || budgetedRows.length === 0) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: budgetedRows.map((row) => row.categoryName),
        datasets: [
          {
            backgroundColor: 'rgba(37, 99, 235, 0.3)',
            borderColor: '#2563eb',
            borderWidth: 1,
            borderRadius: 3,
            data: budgetedRows.map((row) => row.budgetCents),
            label: 'Budget',
          },
          {
            backgroundColor: budgetedRows.map((row) => row.actualCents > row.budgetCents ? '#b42318' : '#15803d'),
            borderRadius: 3,
            data: budgetedRows.map((row) => row.actualCents),
            label: 'Actual',
          },
        ],
      },
      options: {
        animation: false,
        indexAxis: 'y',
        interaction: { intersect: false, mode: 'index' },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { boxHeight: 10, boxWidth: 10, usePointStyle: true },
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.x ?? 0)}`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback(value) {
                return formatCurrency(Number(value));
              },
              maxTicksLimit: 6,
            },
          },
          y: { grid: { display: false } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [budgetedRows]);

  if (budgetedRows.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
        No budgets set for this month. Add one below to compare your plan with actual spending.
      </div>
    );
  }

  const chartHeight = Math.max(256, budgetedRows.length * 52);

  return (
    <div className="space-y-4">
      <div className="relative w-full" style={{ height: chartHeight }}>
        <canvas
          ref={canvasRef}
          aria-label={`Budget compared with actual spending by category for ${monthLabel}`}
          role="img"
        />
      </div>
      <div className="border-t border-ledger-line pt-3">
        <button
          aria-controls="budget-comparison-data"
          aria-expanded={showData}
          className="rounded border border-ledger-line px-3 py-1.5 text-sm font-medium text-ledger-ink hover:bg-slate-50"
          onClick={() => setShowData((isShown) => !isShown)}
          type="button"
        >
          {showData ? 'Hide data table' : 'Show data table'}
        </button>
      </div>
      <div
        className={showData ? 'max-w-full overflow-x-auto' : 'sr-only'}
        id="budget-comparison-data"
      >
        <table className={showData ? 'w-full min-w-[640px] text-left text-sm' : undefined}>
          <caption className={showData ? 'pb-2 text-left font-medium' : undefined}>
            {`Exact budget and actual spending values for ${monthLabel}`}
          </caption>
          <thead>
            <tr className={showData ? 'border-b border-ledger-line text-ledger-muted' : undefined}>
              <th className={showData ? 'py-2 pr-3 font-medium' : undefined}>Category</th>
              <th className={showData ? 'px-3 py-2 text-right font-medium' : undefined}>Budget</th>
              <th className={showData ? 'px-3 py-2 text-right font-medium' : undefined}>Actual</th>
              <th className={showData ? 'px-3 py-2 text-right font-medium' : undefined}>Remaining</th>
              <th className={showData ? 'py-2 pl-3 text-right font-medium' : undefined}>Used</th>
            </tr>
          </thead>
          <tbody>
            {budgetedRows.map((row) => (
              <tr className={showData ? 'border-b border-ledger-line last:border-b-0' : undefined} key={row.categoryId}>
                <th className={showData ? 'py-2 pr-3 font-medium' : undefined}>{row.categoryName}</th>
                <td className={showData ? 'px-3 py-2 text-right' : undefined}>{formatCurrency(row.budgetCents)}</td>
                <td className={showData ? 'px-3 py-2 text-right' : undefined}>{formatCurrency(row.actualCents)}</td>
                <td className={showData ? 'px-3 py-2 text-right' : undefined}>{formatCurrency(row.remainingCents ?? 0)}</td>
                <td className={showData ? 'py-2 pl-3 text-right' : undefined}>{formatPercentage(row.percentageUsed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatPercentage(value: number | null): string {
  return value === null ? 'Not available' : `${value.toFixed(1)}%`;
}
