import { useEffect, useRef, useState } from 'react';
import type { MonthlyCashFlowPoint } from './dashboardService';
import { Chart } from './chartSetup';
import { formatCurrency } from '../../shared/money';

interface CashFlowTrendChartProps {
  data: MonthlyCashFlowPoint[];
}

export function CashFlowTrendChart({ data }: CashFlowTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'bar' | 'line', number[], string> | null>(null);
  const [showData, setShowData] = useState(false);
  const hasData = data.some((item) => item.incomeCents !== 0 || item.expenseCents !== 0);
  const totalIncomeCents = data.reduce((total, item) => total + item.incomeCents, 0);
  const totalExpenseCents = data.reduce((total, item) => total + item.expenseCents, 0);
  const totalNetCents = totalIncomeCents - totalExpenseCents;

  useEffect(() => {
    if (!canvasRef.current || !hasData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.label),
        datasets: [
          {
            backgroundColor: '#15803d',
            borderRadius: 3,
            data: data.map((item) => item.incomeCents),
            label: 'Income',
            type: 'bar',
          },
          {
            backgroundColor: '#b42318',
            borderRadius: 3,
            data: data.map((item) => item.expenseCents),
            label: 'Expenses',
            type: 'bar',
          },
          {
            backgroundColor: '#2563eb',
            borderColor: '#2563eb',
            borderWidth: 2,
            data: data.map((item) => item.netCents),
            label: 'Net cashflow',
            pointRadius: 3,
            tension: 0.2,
            type: 'line',
          },
        ],
      },
      options: {
        animation: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              boxHeight: 10,
              boxWidth: 10,
              usePointStyle: true,
            },
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y ?? 0)}`;
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
            beginAtZero: true,
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
    return <ChartEmptyState>No cash flow recorded in this period.</ChartEmptyState>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <SummaryValue label="Income" value={formatCurrency(totalIncomeCents)} />
        <SummaryValue label="Expenses" value={formatCurrency(totalExpenseCents)} />
        <SummaryValue label="Net" value={formatCurrency(totalNetCents)} />
      </div>
      <div className="relative h-72 w-full">
        <canvas ref={canvasRef} aria-label="Monthly income, expenses, and net cashflow" role="img" />
      </div>
      <button
        aria-controls="cash-flow-trend-data"
        aria-expanded={showData}
        className="rounded border border-ledger-line px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        onClick={() => setShowData((value) => !value)}
        type="button"
      >
        {showData ? 'Hide data table' : 'Show data table'}
      </button>
      <div className={showData ? 'max-w-full overflow-x-auto' : 'sr-only'} id="cash-flow-trend-data">
        <table className={showData ? 'min-w-[520px] text-left text-sm' : undefined}>
          <caption>Monthly cash flow values</caption>
          <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net cashflow</th></tr></thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.monthKey}>
                <th>{item.label}</th><td>{formatCurrency(item.incomeCents)}</td>
                <td>{formatCurrency(item.expenseCents)}</td><td>{formatCurrency(item.netCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return <p><span className="text-ledger-muted">{label}</span><br /><span className="font-semibold">{value}</span></p>;
}

function ChartEmptyState({ children }: { children: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
      {children}
    </div>
  );
}
