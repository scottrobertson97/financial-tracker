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
    expect(await screen.findByText(/Starter accounts and transactions are ready to explore/)).toBeVisible();
  });
});
