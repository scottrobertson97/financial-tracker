import { useEffect, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import type { Account } from '../../features/accounts/accountTypes';
import type { Category } from '../../features/categories/categoryTypes';
import { transactionsToCsv } from '../../features/importExport/csvExport';
import type { Transaction } from '../../features/transactions/transactionTypes';
import { downloadTextFile } from '../../shared/download';

export function ImportExportPage() {
  const {
    accounts: accountService,
    categories: categoryService,
    exportDatabaseBackup,
    restoreDatabaseBackup,
    transactions: transactionService,
  } = useAppServices();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    void loadExportData();
  }, []);

  async function loadExportData() {
    setIsLoading(true);
    setPageError(null);
    try {
      const [nextAccounts, nextCategories, nextTransactions] = await Promise.all([
        accountService.list(),
        categoryService.list(),
        transactionService.list(),
      ]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
      setTransactions(nextTransactions);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load export data.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleExportAll() {
    const csv = transactionsToCsv(transactions, accounts, categories);
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`financial-tracker-transactions-${dateStamp}.csv`, csv, 'text/csv;charset=utf-8');
  }

  function handleDownloadBackup() {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const backup = exportDatabaseBackup();
    downloadTextFile(`financial-tracker-backup-${dateStamp}.sqlite`, backup, 'application/vnd.sqlite3');
  }

  async function handleRestoreBackup(file: File | null) {
    if (!file) {
      return;
    }

    setIsRestoring(true);
    setPageError(null);
    setPageMessage(null);

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      await restoreDatabaseBackup(data);
      await loadExportData();
      setPageMessage('Database backup restored. The current app state has been refreshed.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to restore database backup.');
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Import/Export"
        eyebrow="Data ownership"
        description="CSV export keeps locally persisted transaction data portable."
      />
      {pageError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss">{pageError}</p> : null}
      {pageMessage ? <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-ledger-gain">{pageMessage}</p> : null}
      <div className="rounded-md border border-ledger-line bg-ledger-panel p-4">
        <h2 className="text-base font-semibold">CSV export</h2>
        <p className="mt-2 max-w-2xl text-sm text-ledger-muted">
          Download all transactions with date, account, description, merchant, category, amount,
          status, and notes columns.
        </p>
        <button
          type="button"
          onClick={handleExportAll}
          disabled={isLoading}
          className="mt-4 rounded-md bg-ledger-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export {transactions.length} transactions
        </button>
      </div>
      <div className="rounded-md border border-ledger-line bg-ledger-panel p-4">
        <h2 className="text-base font-semibold">Database backup</h2>
        <p className="mt-2 max-w-2xl text-sm text-ledger-muted">
          Download or restore the local SQLite database file used by this ledger.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={isLoading || isRestoring}
            className="rounded-md bg-ledger-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Download database backup
          </button>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-ledger-line px-4 py-2 text-sm font-medium">
            <input
              type="file"
              accept=".sqlite,.sqlite3,.db,application/vnd.sqlite3,application/octet-stream"
              disabled={isRestoring}
              onChange={(event) => {
                void handleRestoreBackup(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
              className="sr-only"
            />
            {isRestoring ? 'Restoring...' : 'Restore backup'}
          </label>
        </div>
      </div>
    </section>
  );
}
