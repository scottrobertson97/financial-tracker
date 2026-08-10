import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AppServices } from '../appServices';
import { AppServicesContext } from '../appServicesContext';
import type { Budget } from '../../features/budgets/budgetTypes';
import { getCurrentMonthKey } from '../../shared/dates';
import { BudgetsPage } from './BudgetsPage';

vi.mock('../../features/budgets/BudgetComparisonChart', () => ({
  BudgetComparisonChart: () => <div>Budget comparison chart</div>,
}));

describe('BudgetsPage', () => {
  it('loads budgets for the selected month and refreshes when the month changes', async () => {
    const listForMonth = vi.fn().mockResolvedValue([]);
    const services = {
      budgets: {
        delete: vi.fn(),
        listForMonth,
        upsert: vi.fn(),
      },
      categories: {
        list: vi.fn().mockResolvedValue([
          {
            id: 'groceries',
            name: 'Groceries',
            type: 'expense',
            color: '#15803d',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
      },
      transactions: { list: vi.fn().mockResolvedValue([]) },
    } as unknown as AppServices;

    render(
      <AppServicesContext.Provider value={services}>
        <BudgetsPage />
      </AppServicesContext.Provider>,
    );

    await waitFor(() => expect(listForMonth).toHaveBeenCalledWith(getCurrentMonthKey()));
    expect(await screen.findByText('Budget comparison chart')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-07' } });

    await waitFor(() => expect(listForMonth).toHaveBeenCalledWith('2026-07'));
    expect(screen.getByText(/Pending transactions count/)).toBeVisible();
  });

  it('does not apply an in-flight save result to a newly selected month', async () => {
    const currentMonth = getCurrentMonthKey();
    const nextMonth = currentMonth === '2099-01' ? '2099-02' : '2099-01';
    const saveResult = createDeferred<Budget>();
    const upsert = vi.fn().mockReturnValue(saveResult.promise);
    const services = makeBudgetPageServices({
      deleteBudget: vi.fn(),
      listForMonth: vi.fn().mockImplementation(async (month: string) => [
        makeBudget(month, month === currentMonth ? 10000 : 30000),
      ]),
      upsert,
    });

    render(
      <AppServicesContext.Provider value={services}>
        <BudgetsPage />
      </AppServicesContext.Provider>,
    );

    const amountInput = await screen.findByDisplayValue('100.00');
    expect(amountInput).toHaveValue('100.00');
    fireEvent.change(amountInput, { target: { value: '200.00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(upsert).toHaveBeenCalledWith({
      amountCents: 20000,
      categoryId: 'groceries',
      month: currentMonth,
    }));

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: nextMonth } });
    await screen.findByDisplayValue('300.00');

    await act(async () => {
      saveResult.resolve(makeBudget(currentMonth, 20000));
      await saveResult.promise;
    });

    expect(screen.getByDisplayValue('300.00')).toBeVisible();
  });

  it('does not apply an in-flight delete result to a newly selected month', async () => {
    const currentMonth = getCurrentMonthKey();
    const nextMonth = currentMonth === '2099-01' ? '2099-02' : '2099-01';
    const deleteResult = createDeferred<void>();
    const deleteBudget = vi.fn().mockReturnValue(deleteResult.promise);
    const services = makeBudgetPageServices({
      deleteBudget,
      listForMonth: vi.fn().mockImplementation(async (month: string) => [
        makeBudget(month, month === currentMonth ? 10000 : 30000),
      ]),
      upsert: vi.fn(),
    });

    render(
      <AppServicesContext.Provider value={services}>
        <BudgetsPage />
      </AppServicesContext.Provider>,
    );

    await screen.findByDisplayValue('100.00');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(deleteBudget).toHaveBeenCalledWith('groceries', currentMonth));

    fireEvent.change(screen.getByLabelText('Month'), { target: { value: nextMonth } });
    await screen.findByDisplayValue('300.00');

    await act(async () => {
      deleteResult.resolve(undefined);
      await deleteResult.promise;
    });

    expect(screen.getByDisplayValue('300.00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeVisible();
  });
});

function makeBudgetPageServices({
  deleteBudget,
  listForMonth,
  upsert,
}: {
  deleteBudget: ReturnType<typeof vi.fn>;
  listForMonth: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
}): AppServices {
  return {
    budgets: { delete: deleteBudget, listForMonth, upsert },
    categories: {
      list: vi.fn().mockResolvedValue([
        {
          id: 'groceries',
          name: 'Groceries',
          type: 'expense',
          color: '#15803d',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    },
    transactions: { list: vi.fn().mockResolvedValue([]) },
  } as unknown as AppServices;
}

function makeBudget(month: string, amountCents: number): Budget {
  return {
    amountCents,
    categoryId: 'groceries',
    createdAt: '2026-01-01T00:00:00.000Z',
    id: `groceries-${month}`,
    month,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}
