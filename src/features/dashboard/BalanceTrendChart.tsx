import { useEffect, useRef } from 'react';
import type { MonthlyBalancePoint } from './dashboardService';
import { Chart } from './chartSetup';
import { formatCurrency } from '../../shared/money';

interface BalanceTrendChartProps {
  data: MonthlyBalancePoint[];
}

export function BalanceTrendChart({ data }: BalanceTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'line', number[], string> | null>(null);
  const hasData = data.some((item) => item.balanceCents !== 0);
  const currentBalanceCents = data.at(-1)?.balanceCents ?? 0;
  const rangeChangeCents = currentBalanceCents - (data[0]?.balanceCents ?? 0);

  useEffect(() => {
    if (!canvasRef.current || !hasData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((item) => item.label),
        datasets: [{
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          borderColor: '#2563eb',
          borderWidth: 2,
          data: data.map((item) => item.balanceCents),
          fill: true,
          label: 'Total balance',
          pointRadius: 3,
          tension: 0.2,
        }],
      },
      options: {
        animation: false,
        interaction: { intersect: false, mode: 'index' },
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return `Balance: ${formatCurrency(context.parsed.y ?? 0)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, minRotation: 0 },
          },
          y: {
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
  }, [data, hasData]);

  if (!hasData) {
    return (
      <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
        No balance history to chart.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 text-sm">
        <p><span className="text-ledger-muted">Current recorded balance</span><br /><span className="text-lg font-semibold">{formatCurrency(currentBalanceCents)}</span></p>
        <p className={rangeChangeCents < 0 ? 'text-ledger-loss' : 'text-ledger-gain'}>
          {rangeChangeCents >= 0 ? '+' : ''}{formatCurrency(rangeChangeCents)} over range
        </p>
      </div>
      <div className="relative h-64 w-full">
        <canvas ref={canvasRef} aria-label="Total recorded balance by month" role="img" />
      </div>
      <table className="sr-only">
        <caption>Total recorded balance by month</caption>
        <thead><tr><th>Month</th><th>Balance</th></tr></thead>
        <tbody>{data.map((item) => <tr key={item.monthKey}><th>{item.label}</th><td>{formatCurrency(item.balanceCents)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
