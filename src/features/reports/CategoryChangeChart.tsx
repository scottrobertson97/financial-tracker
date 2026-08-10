import { useEffect, useRef } from 'react';
import { Chart } from '../dashboard/chartSetup';
import { formatCurrency } from '../../shared/money';
import type { CategorySpendingChange } from './reportService';
import { ReportTableDisclosure } from './ReportTableDisclosure';

interface CategoryChangeChartProps {
  data: CategorySpendingChange[];
}

export function CategoryChangeChart({ data }: CategoryChangeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'bar', number[], string> | null>(null);
  const chartData = data.slice(0, 8);
  const leadingChange = data[0];

  useEffect(() => {
    if (!canvasRef.current || chartData.length === 0) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: chartData.map((category) => category.name),
        datasets: [{
          backgroundColor: chartData.map((category) =>
            category.deltaCents > 0 ? '#b42318' : category.deltaCents < 0 ? '#15803d' : '#64748b'),
          borderRadius: 3,
          data: chartData.map((category) => category.deltaCents),
          label: 'Spending change',
        }],
      },
      options: {
        animation: false,
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return `Change: ${formatSignedCurrency(context.parsed.x ?? 0)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              callback(value) {
                return formatCurrency(Number(value));
              },
              maxTicksLimit: 6,
            },
            title: { display: true, text: 'Change versus the same days last month' },
          },
          y: { grid: { display: false } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
        No expense activity to compare across these two month-to-date periods.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-sm leading-6 text-ledger-muted">
        <span className="font-semibold text-ledger-ink">{leadingChange.name}</span> had the largest change:{' '}
        <span className={leadingChange.deltaCents > 0 ? 'font-semibold text-ledger-loss' : leadingChange.deltaCents < 0 ? 'font-semibold text-ledger-gain' : 'font-semibold text-ledger-ink'}>
          {leadingChange.deltaCents === 0
            ? 'no change'
            : `${formatSignedCurrency(leadingChange.deltaCents)} (${leadingChange.deltaCents > 0 ? 'more' : 'less'})`}
        </span> than the same days last month.
      </p>
      <div className="relative h-72 min-w-0 w-full">
        <canvas
          ref={canvasRef}
          aria-label="Expense category changes versus the same days last month"
          className="max-w-full"
          role="img"
        />
      </div>
      <ReportTableDisclosure label="Show exact category comparison">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Category spending for the current and previous month through the same day</caption>
          <thead>
            <tr className="border-b border-ledger-line">
              <th className="px-2 py-2 font-semibold" scope="col">Category</th>
              <th className="px-2 py-2 text-right font-semibold" scope="col">This month</th>
              <th className="px-2 py-2 text-right font-semibold" scope="col">Last month</th>
              <th className="px-2 py-2 text-right font-semibold" scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {data.map((category) => (
              <tr className="border-b border-ledger-line last:border-0" key={category.categoryId ?? 'uncategorized'}>
                <th className="whitespace-nowrap px-2 py-2 font-medium" scope="row">{category.name}</th>
                <td className="whitespace-nowrap px-2 py-2 text-right">{formatCurrency(category.currentCents)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">{formatCurrency(category.previousCents)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">{formatSignedCurrency(category.deltaCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTableDisclosure>
    </div>
  );
}

function formatSignedCurrency(cents: number): string {
  return cents > 0 ? `+${formatCurrency(cents)}` : formatCurrency(cents);
}
