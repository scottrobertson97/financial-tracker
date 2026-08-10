import { useEffect, useRef, useState } from 'react';
import type { SpendingPaceSummary } from './dashboardService';
import { Chart } from './chartSetup';
import { formatCurrency } from '../../shared/money';

interface SpendingPaceChartProps {
  data: SpendingPaceSummary;
}

export function SpendingPaceChart({ data }: SpendingPaceChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'line', (number | null)[], number> | null>(null);
  const [showData, setShowData] = useState(false);
  const hasData = data.points.some(
    (point) => (point.currentMonthCents ?? 0) !== 0 || (point.previousMonthCents ?? 0) !== 0,
  );

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
        labels: data.points.map((point) => point.day),
        datasets: [
          {
            borderColor: '#b42318',
            borderWidth: 2,
            data: data.points.map((point) => point.currentMonthCents),
            label: data.currentMonthLabel,
            pointRadius: 0,
            spanGaps: false,
            tension: 0.2,
          },
          {
            borderColor: '#64748b',
            borderDash: [5, 4],
            borderWidth: 2,
            data: data.points.map((point) => point.previousMonthCents),
            label: data.previousMonthLabel,
            pointRadius: 0,
            spanGaps: false,
            tension: 0.2,
          },
        ],
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
              label(context) {
                return `${context.dataset.label}: ${formatCurrency(context.parsed.y ?? 0)}`;
              },
              title(items) {
                return `Day ${items[0]?.label ?? ''}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            title: { display: true, text: 'Day of month' },
            ticks: { maxRotation: 0, minRotation: 0, maxTicksLimit: 8 },
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
    return (
      <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
        No expenses recorded in either comparison month.
      </div>
    );
  }

  const comparisonText = data.deltaPercentage === null
    ? 'No prior-period spending'
    : `${Math.abs(data.deltaPercentage).toFixed(1)}% ${data.deltaCents > 0 ? 'more' : data.deltaCents < 0 ? 'less' : 'change'} through the same day`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 text-sm">
        <p><span className="text-ledger-muted">Spent this month</span><br /><span className="text-lg font-semibold">{formatCurrency(data.currentToDateCents)}</span></p>
        <p className={data.deltaCents > 0 ? 'text-ledger-loss' : data.deltaCents < 0 ? 'text-ledger-gain' : 'text-ledger-muted'}>{comparisonText}</p>
      </div>
      <div className="relative h-64 w-full">
        <canvas ref={canvasRef} aria-label="Cumulative spending by day for the current and previous month" role="img" />
      </div>
      <button
        aria-controls="spending-pace-data"
        aria-expanded={showData}
        className="rounded border border-ledger-line px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        onClick={() => setShowData((value) => !value)}
        type="button"
      >
        {showData ? 'Hide data table' : 'Show data table'}
      </button>
      <div className={showData ? 'max-h-80 max-w-full overflow-auto' : 'sr-only'} id="spending-pace-data">
        <table className={showData ? 'min-w-[520px] text-left text-sm' : undefined}>
          <caption>Cumulative spending pace by day</caption>
          <thead><tr><th>Day</th><th>{data.currentMonthLabel}</th><th>{data.previousMonthLabel}</th></tr></thead>
          <tbody>
            {data.points.map((point) => (
              <tr key={point.day}><th>{point.day}</th><td>{point.currentMonthCents === null ? 'Not elapsed' : formatCurrency(point.currentMonthCents)}</td><td>{point.previousMonthCents === null ? 'Not in month' : formatCurrency(point.previousMonthCents)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
