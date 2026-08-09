import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AppServices } from '../appServices';
import { AppServicesContext } from '../appServicesContext';
import { DashboardPage } from './DashboardPage';

vi.mock('../../features/dashboard/CashFlowTrendChart', () => ({
  CashFlowTrendChart: ({ data }: { data: unknown[] }) => <div data-testid="cash-flow-points">{data.length}</div>,
}));
vi.mock('../../features/dashboard/BalanceTrendChart', () => ({
  BalanceTrendChart: ({ data }: { data: unknown[] }) => <div data-testid="balance-points">{data.length}</div>,
}));
vi.mock('../../features/dashboard/SpendingPaceChart', () => ({
  SpendingPaceChart: () => <div>Spending pace chart</div>,
}));
vi.mock('../../features/dashboard/CategoryUsageChart', () => ({
  CategoryUsageChart: () => <div>Category usage chart</div>,
}));

describe('DashboardPage', () => {
  it('switches shared trend widgets between six and twelve months', async () => {
    const services = {
      accounts: { list: vi.fn().mockResolvedValue([]) },
      categories: { list: vi.fn().mockResolvedValue([]) },
      transactions: { list: vi.fn().mockResolvedValue([]) },
    } as unknown as AppServices;

    render(
      <AppServicesContext.Provider value={services}>
        <DashboardPage />
      </AppServicesContext.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId('cash-flow-points')).toHaveTextContent('6'));
    expect(screen.getByTestId('balance-points')).toHaveTextContent('6');
    expect(screen.getByRole('button', { name: '6 months' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '12 months' }));

    expect(screen.getByTestId('cash-flow-points')).toHaveTextContent('12');
    expect(screen.getByTestId('balance-points')).toHaveTextContent('12');
    expect(screen.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true');
  });
});
