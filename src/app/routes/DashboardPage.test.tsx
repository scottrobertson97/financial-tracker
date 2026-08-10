import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByText('6-month cash-surplus rate')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '12 months' }));

    expect(screen.getByTestId('cash-flow-points')).toHaveTextContent('12');
    expect(screen.getByTestId('balance-points')).toHaveTextContent('12');
    expect(screen.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('12-month cash-surplus rate')).toBeInTheDocument();
  });

  it('shows recorded position, unavailable surplus rate, and review queue counts', async () => {
    const services = {
      accounts: {
        list: vi.fn().mockResolvedValue([
          {
            id: 'checking',
            name: 'Checking',
            type: 'checking',
            startingBalanceCents: 100000,
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
          {
            id: 'credit',
            name: 'Credit card',
            type: 'credit',
            startingBalanceCents: -25000,
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
        ]),
      },
      categories: { list: vi.fn().mockResolvedValue([]) },
      transactions: {
        list: vi.fn().mockResolvedValue([{
          id: 'needs-review',
          accountId: 'checking',
          categoryId: null,
          amountCents: -1000,
          createdAt: '2026-08-01T12:00:00.000Z',
          date: '2026-08-01',
          description: 'Needs review',
          status: 'pending',
          updatedAt: '2026-08-01T12:00:00.000Z',
        }]),
      },
    } as unknown as AppServices;

    render(
      <AppServicesContext.Provider value={services}>
        <DashboardPage />
      </AppServicesContext.Provider>,
    );

    await waitFor(() => expect(screen.getByText('Recorded assets').parentElement).toHaveTextContent('$990.00'));
    expect(screen.getByText('Recorded debt').parentElement).toHaveTextContent('$250.00');
    expect(screen.getByText('Recorded net worth').parentElement).toHaveTextContent('$740.00');
    expect(screen.getByText('6-month cash-surplus rate').parentElement).toHaveTextContent('Not available');

    const reviewQueue = screen.getByRole('heading', { name: 'Review queue' }).closest('section');
    expect(reviewQueue).not.toBeNull();
    expect(within(reviewQueue!).getByText('Uncategorized').parentElement).toHaveTextContent('1');
    expect(within(reviewQueue!).getByText('Pending').parentElement).toHaveTextContent('1');
  });
});
