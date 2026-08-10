import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BudgetOverviewRow } from './budgetOverview';
import { BudgetComparisonChart } from './BudgetComparisonChart';

const chartState = vi.hoisted(() => ({
  configs: [] as unknown[],
  instances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
}));

vi.mock('../dashboard/chartSetup', () => ({
  Chart: class MockChart {
    destroy = vi.fn();

    constructor(_canvas: unknown, config: unknown) {
      chartState.configs.push(config);
      chartState.instances.push(this);
    }
  },
}));

describe('BudgetComparisonChart', () => {
  beforeEach(() => {
    chartState.configs.length = 0;
    chartState.instances.length = 0;
  });

  it('renders a horizontal chart and an exact accessible values table', () => {
    render(<BudgetComparisonChart monthLabel="Jul 2026" rows={[makeRow()]} />);

    expect(screen.getByRole('img', { name: 'Budget compared with actual spending by category for Jul 2026' }))
      .toBeInTheDocument();
    const exactValuesTable = screen.getByRole('table', {
      name: 'Exact budget and actual spending values for Jul 2026',
    });
    expect(exactValuesTable).toHaveTextContent('Groceries$100.00$75.00$25.0075.0%');
    expect(exactValuesTable).not.toHaveClass('sr-only');
    expect(exactValuesTable.parentElement).toHaveClass('sr-only');
    expect(chartState.instances).toHaveLength(1);
    expect(chartState.configs[0]).toMatchObject({ options: { indexAxis: 'y' } });

    const toggle = screen.getByRole('button', { name: 'Show data table' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(exactValuesTable.parentElement).not.toHaveClass('sr-only');
    expect(exactValuesTable.parentElement).toHaveClass('overflow-x-auto');
    expect(exactValuesTable).toHaveClass('min-w-[640px]');
  });

  it('destroys replaced charts and shows an explicit empty state', () => {
    const { rerender } = render(<BudgetComparisonChart monthLabel="Jul 2026" rows={[makeRow()]} />);

    rerender(<BudgetComparisonChart monthLabel="Jul 2026" rows={[]} />);

    expect(chartState.instances[0].destroy).toHaveBeenCalled();
    expect(screen.getByText(/No budgets set for this month/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

function makeRow(): BudgetOverviewRow {
  return {
    actualCents: 7500,
    budgetCents: 10000,
    budgetId: 'budget',
    categoryId: 'groceries',
    categoryName: 'Groceries',
    color: '#15803d',
    historicalAverageCents: 8000,
    percentageUsed: 75,
    remainingCents: 2500,
  };
}
