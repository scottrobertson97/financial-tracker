import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AppServices } from '../appServices';
import { AppServicesContext } from '../appServicesContext';
import { ReportsPage } from './ReportsPage';

vi.mock('../../features/reports/CategorySpendingTrendChart', () => ({
  CategorySpendingTrendChart: ({ data }: { data: { months: unknown[] } }) => (
    <div data-testid="spending-trend-months">{data.months.length}</div>
  ),
}));
vi.mock('../../features/reports/CashSurplusRateChart', () => ({
  CashSurplusRateChart: ({ data }: { data: unknown[] }) => <div data-testid="surplus-months">{data.length}</div>,
}));
vi.mock('../../features/reports/CategoryChangeChart', () => ({
  CategoryChangeChart: () => <div>Category change chart</div>,
}));

describe('ReportsPage', () => {
  it('loads ledger data and switches all period reports between six and twelve months', async () => {
    const services = {
      categories: { list: vi.fn().mockResolvedValue([]) },
      transactions: { list: vi.fn().mockResolvedValue([]) },
    } as unknown as AppServices;

    render(
      <AppServicesContext.Provider value={services}>
        <ReportsPage />
      </AppServicesContext.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId('spending-trend-months')).toHaveTextContent('6'));
    expect(screen.getByTestId('surplus-months')).toHaveTextContent('6');
    expect(screen.getByRole('button', { name: '6 months' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Cash surplus rate' }).closest('section')).toHaveClass('min-w-0');
    expect(screen.getByRole('heading', { name: 'What changed this month' }).closest('section')).toHaveClass('min-w-0');

    fireEvent.click(screen.getByRole('button', { name: '12 months' }));

    expect(screen.getByTestId('spending-trend-months')).toHaveTextContent('12');
    expect(screen.getByTestId('surplus-months')).toHaveTextContent('12');
    expect(screen.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true');
  });
});
