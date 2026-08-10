import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BalanceTrendChart } from './BalanceTrendChart';
import { CashFlowTrendChart } from './CashFlowTrendChart';
import { CategoryUsageChart } from './CategoryUsageChart';
import { SpendingPaceChart } from './SpendingPaceChart';

const chartState = vi.hoisted(() => ({
  instances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
}));

vi.mock('./chartSetup', () => ({
  Chart: class MockChart {
    destroy = vi.fn();

    constructor() {
      chartState.instances.push(this);
    }
  },
}));

describe('dashboard charts', () => {
  beforeEach(() => {
    chartState.instances.length = 0;
  });

  it('creates, replaces, and destroys a chart instance when data changes', () => {
    const firstData = [{
      expenseCents: 5000,
      incomeCents: 10000,
      label: 'Jun 2026',
      monthKey: '2026-06',
      netCents: 5000,
    }];
    const { rerender, unmount } = render(<CashFlowTrendChart data={firstData} />);

    expect(screen.getByRole('img', { name: 'Monthly income, expenses, and net cashflow' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Monthly cash flow values' })).toBeInTheDocument();
    expect(chartState.instances).toHaveLength(1);

    rerender(<CashFlowTrendChart data={[{ ...firstData[0], expenseCents: 6000, netCents: 4000 }]} />);

    expect(chartState.instances).toHaveLength(2);
    expect(chartState.instances[0].destroy).toHaveBeenCalled();

    unmount();
    expect(chartState.instances[1].destroy).toHaveBeenCalled();
  });

  it('shows explicit empty states instead of blank canvases', () => {
    const { rerender } = render(<BalanceTrendChart data={[{ balanceCents: 0, label: 'Jun 2026', monthKey: '2026-06' }]} />);
    expect(screen.getByText('No balance history to chart.')).toBeInTheDocument();

    rerender(<SpendingPaceChart data={{
      currentMonthLabel: 'Jun 2026',
      currentToDateCents: 0,
      deltaCents: 0,
      deltaPercentage: null,
      points: [{ currentMonthCents: 0, day: 1, previousMonthCents: 0 }],
      previousMonthLabel: 'May 2026',
      previousToDateCents: 0,
    }} />);
    expect(screen.getByText('No expenses recorded in either comparison month.')).toBeInTheDocument();

    rerender(<CategoryUsageChart data={[]} positiveSpendingCents={0} />);
    expect(screen.getByText('No current-month expense categories to chart.')).toBeInTheDocument();
    expect(chartState.instances).toHaveLength(0);
  });

  it('renders exact accessible values alongside the category canvas', () => {
    render(<CategoryUsageChart
      data={[{ amountCents: 2500, categoryId: 'groceries', color: '#15803d', name: 'Groceries', percentage: 100 }]}
      positiveSpendingCents={2500}
    />);

    expect(screen.getByRole('img', { name: 'Ranked current-month net spending by category' })).toBeInTheDocument();
    expect(screen.getByText('Groceries is the largest positive net spending category at $25.00 (100.0% of $25.00 positive category spending).')).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Current-month net spending by category' });
    expect(table.parentElement).toHaveClass('sr-only');
    expect(table).toHaveTextContent('$25.00');

    fireEvent.click(screen.getByRole('button', { name: 'Show data table' }));

    expect(table.parentElement).not.toHaveClass('sr-only');
    expect(screen.getByRole('button', { name: 'Hide data table' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('describes refund-only category activity without a misleading percentage', () => {
    render(<CategoryUsageChart
      data={[{ amountCents: -2500, categoryId: 'groceries', color: '#15803d', name: 'Groceries', percentage: null }]}
      positiveSpendingCents={0}
    />);

    expect(screen.getByText('Groceries produced the largest net refund credit at $25.00.')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Current-month net spending by category' })).toHaveTextContent('Not applicable');
  });
});
