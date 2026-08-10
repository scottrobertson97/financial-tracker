import { useEffect, useRef, useState } from 'react';
import type { CategoryUsageChartItem } from './dashboardService';
import { Chart } from './chartSetup';
import { formatCurrency } from '../../shared/money';

interface CategoryUsageChartProps {
  data: CategoryUsageChartItem[];
  positiveSpendingCents: number;
}

export function CategoryUsageChart({ data, positiveSpendingCents }: CategoryUsageChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'bar', number[], string> | null>(null);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.name),
        datasets: [
          {
            data: data.map((item) => item.amountCents),
            backgroundColor: data.map((item) => item.color),
            borderRadius: 3,
            label: 'Net spending',
          },
        ],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label(context) {
                const item = data[context.dataIndex];
                if (!item) {
                  return '';
                }

                const percentage = item.percentage === null ? '' : ` (${item.percentage.toFixed(1)}%)`;
                return `${item.name}: ${formatCurrency(item.amountCents)}${percentage}`;
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
              maxTicksLimit: 5,
            },
          },
          y: {
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
        No current-month expense categories to chart.
      </div>
    );
  }

  const leadingCategory = data.find((item) => item.amountCents > 0);
  const refundLeader = [...data]
    .filter((item) => item.amountCents < 0)
    .sort((a, b) => a.amountCents - b.amountCents)[0];
  const takeaway = leadingCategory && leadingCategory.percentage !== null
    ? `${leadingCategory.name} is the largest positive net spending category at ${formatCurrency(leadingCategory.amountCents)} (${leadingCategory.percentage.toFixed(1)}% of ${formatCurrency(positiveSpendingCents)} positive category spending).`
    : refundLeader
      ? `${refundLeader.name} produced the largest net refund credit at ${formatCurrency(Math.abs(refundLeader.amountCents))}.`
      : 'No net category spending is available.';

  return (
    <div className="space-y-4">
      <p className="text-sm text-ledger-muted">
        {takeaway}
      </p>
      <div className="relative h-72">
        <canvas ref={canvasRef} aria-label="Ranked current-month net spending by category" role="img" />
      </div>
      <div className="border-t border-ledger-line pt-3">
        <button
          aria-controls="category-spending-data"
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
        id="category-spending-data"
      >
        <table className={showData ? 'min-w-[420px] text-left text-sm' : undefined}>
          <caption className={showData ? 'pb-2 text-left font-medium' : undefined}>Current-month net spending by category</caption>
          <thead><tr className={showData ? 'border-b border-ledger-line text-ledger-muted' : undefined}><th className={showData ? 'py-2 pr-3 font-medium' : undefined}>Category</th><th className={showData ? 'px-3 py-2 text-right font-medium' : undefined}>Amount</th><th className={showData ? 'py-2 pl-3 text-right font-medium' : undefined}>Share of positive spending</th></tr></thead>
          <tbody>
            {data.map((item) => (
              <tr className={showData ? 'border-b border-ledger-line last:border-b-0' : undefined} key={item.categoryId ?? 'uncategorized'}>
                <th className={showData ? 'py-2 pr-3 font-medium' : undefined}>{item.name}</th><td className={showData ? 'px-3 py-2 text-right' : undefined}>{formatCurrency(item.amountCents)}</td><td className={showData ? 'py-2 pl-3 text-right' : undefined}>{item.percentage === null ? 'Not applicable' : `${item.percentage.toFixed(1)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
