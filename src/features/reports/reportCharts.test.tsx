import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CashSurplusRateChart } from './CashSurplusRateChart';
import { CategoryChangeChart } from './CategoryChangeChart';
import { CategorySpendingTrendChart } from './CategorySpendingTrendChart';

const chartState = vi.hoisted(() => ({
  instances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
}));

vi.mock('../dashboard/chartSetup', () => ({
  Chart: class MockChart {
    destroy = vi.fn();

    constructor() {
      chartState.instances.push(this);
    }
  },
}));

describe('report charts', () => {
  beforeEach(() => {
    chartState.instances.length = 0;
  });

  it('pairs a stacked spending chart with a visible takeaway and exact table', () => {
    render(<CategorySpendingTrendChart data={{
      months: [{ label: 'Aug 2026', monthKey: '2026-08' }],
      series: [{
        categoryId: 'groceries',
        color: '#15803d',
        monthlyCents: [2_500],
        name: 'Groceries',
        totalCents: 2_500,
      }],
      totalCents: 2_500,
    }} />);

    expect(screen.getByText(/led net spending/).closest('p')).toHaveTextContent('Groceries led net spending at $25.00, 100% of positive net category spending.');
    expect(screen.getByRole('img', { name: 'Monthly net spending stacked by expense category' })).toHaveClass('max-w-full');
    fireEvent.click(screen.getByText('Show exact monthly spending'));
    expect(screen.getByRole('table', { name: 'Monthly net spending by category' })).toHaveTextContent('$25.00');
    expect(chartState.instances).toHaveLength(1);
  });

  it('preserves exact data when expense activity nets to zero after refunds', () => {
    render(<CategorySpendingTrendChart data={{
      months: [{ label: 'Aug 2026', monthKey: '2026-08' }],
      series: [{
        categoryId: 'groceries',
        color: '#15803d',
        monthlyCents: [0],
        name: 'Groceries',
        totalCents: 0,
      }],
      totalCents: 0,
    }} />);

    expect(screen.getByText(/Expense activity netted to/).closest('p')).toHaveTextContent(
      'Expense activity netted to $0.00 after refunds.',
    );
    expect(screen.getByText('No net spending remains to chart after refunds.')).toBeInTheDocument();
    expect(screen.queryByText('No expense activity was recorded in this period.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Show exact monthly spending'));
    expect(screen.getByRole('table', { name: 'Monthly net spending by category' })).toHaveTextContent('$0.00');
    expect(chartState.instances).toHaveLength(0);
  });

  it('bases the leading-category share only on positive net category spending', () => {
    render(<CategorySpendingTrendChart data={{
      months: [{ label: 'Aug 2026', monthKey: '2026-08' }],
      series: [
        { categoryId: 'rent', color: '#2563eb', monthlyCents: [10_000], name: 'Rent', totalCents: 10_000 },
        { categoryId: 'food', color: '#15803d', monthlyCents: [5_000], name: 'Food', totalCents: 5_000 },
        { categoryId: 'clothing', color: '#b42318', monthlyCents: [-10_000], name: 'Clothing', totalCents: -10_000 },
      ],
      totalCents: 5_000,
    }} />);

    const takeaway = screen.getByText(/led net spending/).closest('p');
    expect(takeaway).toHaveTextContent('Rent led net spending at $100.00, 66.7% of positive net category spending.');
    expect(takeaway).toHaveTextContent('Refunds reduced overall net spending to $50.00.');
    expect(takeaway).not.toHaveTextContent('200%');
  });

  it('explains when cash surplus rate is unavailable while retaining exact cash values', () => {
    render(<CashSurplusRateChart data={[{
      expenseCents: 1_000,
      incomeCents: 0,
      label: 'Aug 2026',
      monthKey: '2026-08',
      surplusCents: -1_000,
      surplusRate: null,
    }]} />);

    expect(screen.getByText('Add positive income to calculate a cash surplus rate.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Monthly cash surplus rate' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Show exact cash surplus data'));
    expect(screen.getByRole('table', { name: 'Monthly cash surplus calculations' })).toHaveTextContent('Not available');
    expect(chartState.instances).toHaveLength(0);
  });

  it('shows direction and exact values for same-day category changes', () => {
    render(<CategoryChangeChart data={[{
      categoryId: 'dining',
      color: '#b42318',
      currentCents: 4_000,
      deltaCents: 1_500,
      deltaRate: 0.6,
      name: 'Dining',
      previousCents: 2_500,
    }]} />);

    expect(screen.getByText(/had the largest change/).closest('p')).toHaveTextContent('Dining had the largest change: +$15.00 (more) than the same days last month.');
    expect(screen.getByRole('img', { name: 'Expense category changes versus the same days last month' })).toHaveClass('max-w-full');
    fireEvent.click(screen.getByText('Show exact category comparison'));
    expect(screen.getByRole('table', { name: /Category spending for the current and previous month/ })).toHaveTextContent('+$15.00');
  });
});
