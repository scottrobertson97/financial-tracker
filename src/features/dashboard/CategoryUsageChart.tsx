import { useEffect, useRef } from 'react';
import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from 'chart.js';
import type { CategoryUsageChartItem } from './dashboardService';
import { formatCurrency } from '../../shared/money';

Chart.register(ArcElement, DoughnutController, Legend, Tooltip);

interface CategoryUsageChartProps {
  data: CategoryUsageChartItem[];
  totalExpensesCents: number;
}

export function CategoryUsageChart({ data, totalExpensesCents }: CategoryUsageChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'doughnut'> | null>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map((item) => item.name),
        datasets: [
          {
            data: data.map((item) => item.amountCents),
            backgroundColor: data.map((item) => item.color),
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        cutout: '62%',
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

                return `${item.name}: ${formatCurrency(item.amountCents)} (${item.percentage.toFixed(1)}%)`;
              },
            },
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

  return (
    <div className="space-y-4">
      <div className="relative h-64">
        <canvas ref={canvasRef} aria-label="Current-month expense usage by category" role="img" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-ledger-muted">Expenses</p>
            <p className="text-lg font-semibold">{formatCurrency(totalExpensesCents)}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {data.map((item) => (
          <div key={item.categoryId ?? 'uncategorized'} className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 font-medium">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
