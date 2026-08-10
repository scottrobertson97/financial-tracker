import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppServices } from '../appServices';
import { AppServicesContext } from '../appServicesContext';
import { ImportExportPage } from './ImportExportPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ImportExportPage', () => {
  it('requires confirmation before resetting to starter data', async () => {
    const resetToStarterLedger = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const services = {
      accounts: { list: vi.fn().mockResolvedValue([]) },
      categories: { list: vi.fn().mockResolvedValue([]) },
      exportDatabaseBackup: vi.fn().mockReturnValue(new Uint8Array()),
      resetToEmptyLedger: vi.fn(),
      resetToStarterLedger,
      restoreDatabaseBackup: vi.fn(),
      transactions: { list: vi.fn().mockResolvedValue([]) },
    } as unknown as AppServices;

    render(
      <AppServicesContext.Provider value={services}>
        <ImportExportPage />
      </AppServicesContext.Provider>,
    );

    const resetButton = await screen.findByRole('button', { name: 'Reset to starter data' });
    await waitFor(() => expect(resetButton).toBeEnabled());

    fireEvent.click(resetButton);
    expect(resetToStarterLedger).not.toHaveBeenCalled();

    fireEvent.click(resetButton);
    await waitFor(() => expect(resetToStarterLedger).toHaveBeenCalledOnce());
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls[1]?.[0]).toMatch(/accounts, categories, transactions, and budgets/);
    expect(screen.getByText(/replace all current accounts, categories, transactions, and budgets/i)).toBeVisible();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Starter accounts, categories, transactions, and budgets are ready to explore.',
    );
  });

  it('requires confirmation and leaves a distinct live result when resetting to zero', async () => {
    const resetToEmptyLedger = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const services = {
      accounts: { list: vi.fn().mockResolvedValue([]) },
      categories: { list: vi.fn().mockResolvedValue([]) },
      exportDatabaseBackup: vi.fn().mockReturnValue(new Uint8Array()),
      resetToEmptyLedger,
      resetToStarterLedger: vi.fn(),
      restoreDatabaseBackup: vi.fn(),
      transactions: { list: vi.fn().mockResolvedValue([]) },
    } as unknown as AppServices;

    render(
      <AppServicesContext.Provider value={services}>
        <ImportExportPage />
      </AppServicesContext.Provider>,
    );

    const resetButton = await screen.findByRole('button', { name: 'Reset to zero' });
    await waitFor(() => expect(resetButton).toBeEnabled());
    fireEvent.click(resetButton);

    await waitFor(() => expect(resetToEmptyLedger).toHaveBeenCalledOnce());
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/budgets and leaves the app empty/));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Ledger reset to zero. All accounts, categories, transactions, and budgets were removed.',
    );
  });

  it('announces reset failures as alerts', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const services = {
      accounts: { list: vi.fn().mockResolvedValue([]) },
      categories: { list: vi.fn().mockResolvedValue([]) },
      exportDatabaseBackup: vi.fn().mockReturnValue(new Uint8Array()),
      resetToEmptyLedger: vi.fn().mockRejectedValue(new Error('Storage unavailable.')),
      resetToStarterLedger: vi.fn(),
      restoreDatabaseBackup: vi.fn(),
      transactions: { list: vi.fn().mockResolvedValue([]) },
    } as unknown as AppServices;

    render(
      <AppServicesContext.Provider value={services}>
        <ImportExportPage />
      </AppServicesContext.Provider>,
    );

    const resetButton = await screen.findByRole('button', { name: 'Reset to zero' });
    await waitFor(() => expect(resetButton).toBeEnabled());
    fireEvent.click(resetButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable.');
  });
});
