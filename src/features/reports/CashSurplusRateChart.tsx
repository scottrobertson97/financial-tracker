import { useEffect, useRef } from 'react';
import { Chart } from '../dashboard/chartSetup';
import { formatCurrency } from '../../shared/money';
import type { MonthlyCashSurplusPoint } from './reportService';
import { ReportTableDisclosure } from './ReportTableDisclosure';

interface CashSurplusRateChartProps {
  data: MonthlyCashSurplusPoint[];
}

export function CashSurplusRateChart({ data }: CashSurplusRateChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart<'line', (number | null)[], string> | null>(null);
  const hasRateData = data.some((point) => point.surplusRate !== null);
  const latestPoint = data.at(-1);

  useEffect(() => {
    if (!canvasRef.current || !hasRateData) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((point) => point.label),
        datasets: [{
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          borderColor: '#2563eb',
          borderWidth: 2,
          data: data.map((point) => point.surplusRate === null ? null : point.surplusRate * 100),
          fill: true,
          label: 'Cash surplus rate',
          pointRadius: 3,
          spanGaps: false,
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
                return `Cash surplus rate: ${formatPercentValue((context.parsed.y ?? 0) / 100)}`;
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
                return `${Number(value).toFixed(0)}%`;
              },
              maxTicksLimit: 6,
            },
            title: { display: true, text: 'Income kept after expenses' },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, hasRateData]);

  return (
    <div className="min-w-0 space-y-4">
      {latestPoint ? <LatestSurplusTakeaway point={latestPoint} /> : null}
      {hasRateData ? (
        <div className="relative h-64 min-w-0 w-full">
          <canvas ref={canvasRef} aria-label="Monthly cash surplus rate" className="max-w-full" role="img" />
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-ledger-line bg-slate-50 px-4 text-center text-sm text-ledger-muted">
          Add positive income to calculate a cash surplus rate.
        </div>
      )}
      <ReportTableDisclosure label="Show exact cash surplus data">
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">Monthly cash surplus calculations</caption>
          <thead>
            <tr className="border-b border-ledger-line">
              <th className="px-2 py-2 font-semibold" scope="col">Month</th>
              <th className="px-2 py-2 text-right font-semibold" scope="col">Income</th>
              <th className="px-2 py-2 text-right font-semibold" scope="col">Expenses</th>
              <th className="px-2 py-2 text-right font-semibold" scope="col">Surplus</th>
              <th className="px-2 py-2 text-right font-semibold" scope="col">Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr className="border-b border-ledger-line last:border-0" key={point.monthKey}>
                <th className="whitespace-nowrap px-2 py-2 font-medium" scope="row">{point.label}</th>
                <td className="whitespace-nowrap px-2 py-2 text-right">{formatCurrency(point.incomeCents)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">{formatCurrency(point.expenseCents)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">{formatCurrency(point.surplusCents)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  {point.surplusRate === null ? 'Not available' : formatPercentValue(point.surplusRate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportTableDisclosure>
    </div>
  );
}

function LatestSurplusTakeaway({ point }: { point: MonthlyCashSurplusPoint }) {
  if (point.surplusRate === null) {
    return (
      <p className="text-sm leading-6 text-ledger-muted">
        <span className="font-semibold text-ledger-ink">{point.label}</span> has no positive income, so its surplus rate is not available.
      </p>
    );
  }

  return (
    <p className="text-sm leading-6 text-ledger-muted">
      In <span className="font-semibold text-ledger-ink">{point.label}</span>, you kept{' '}
      <span className="font-semibold text-ledger-ink">{formatPercentValue(point.surplusRate)}</span> of income after expenses
      {' '}({formatCurrency(point.surplusCents)} surplus).
    </p>
  );
}

function formatPercentValue(rate: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, style: 'percent' }).format(rate);
}
