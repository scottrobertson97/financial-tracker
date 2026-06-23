import { useEffect, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import type { Account } from '../../features/accounts/accountTypes';
import type { Category } from '../../features/categories/categoryTypes';
import { transactionsToCsv } from '../../features/importExport/csvExport';
import { TransactionFilters, type TransactionFilterValues } from '../../features/transactions/TransactionFilters';
import { TransactionForm } from '../../features/transactions/TransactionForm';
import { TransactionList } from '../../features/transactions/TransactionList';
import type { CreateTransactionInput, TransactionFilters as RepositoryTransactionFilters } from '../../features/transactions/transactionRepository';
import type { Transaction } from '../../features/transactions/transactionTypes';
import { getCurrentMonthKey } from '../../shared/dates';
import { downloadTextFile } from '../../shared/download';

const defaultFilters: TransactionFilterValues = {
  accountId: '',
  categoryId: '',
  month: getCurrentMonthKey(),
  search: '',
};

export function TransactionsPage() {
  const { accounts: accountService, categories: categoryService, transactions: transactionService } = useAppServices();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFilterValues>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    void loadReferenceData();
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [filters]);

  async function loadReferenceData() {
    setPageError(null);
    try {
      const [nextAccounts, nextCategories] = await Promise.all([accountService.list(), categoryService.list()]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load ledger setup.');
    }
  }

  async function loadTransactions() {
    setIsLoading(true);
    setPageError(null);
    try {
      setTransactions(await transactionService.list(toRepositoryFilters(filters)));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load transactions.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(input: CreateTransactionInput) {
    setIsSubmitting(true);
    setPageError(null);
    try {
      if (editingTransaction) {
        await transactionService.update(editingTransaction.id, input);
        setEditingTransaction(null);
      } else {
        await transactionService.create(input);
      }
      await loadTransactions();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(transaction: Transaction) {
    setPageError(null);
    try {
      await transactionService.delete(transaction.id);
      if (editingTransaction?.id === transaction.id) {
        setEditingTransaction(null);
      }
      await loadTransactions();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to delete transaction.');
    }
  }

  function handleExportCurrentView() {
    const csv = transactionsToCsv(transactions, accounts, categories);
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`financial-tracker-transactions-filtered-${dateStamp}.csv`, csv, 'text/csv;charset=utf-8');
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Transactions"
        eyebrow="Ledger"
        description="Add, edit, filter, and review locally persisted transactions."
      />
      <TransactionForm
        accounts={accounts}
        categories={categories}
        isSubmitting={isSubmitting}
        onCancelEdit={() => setEditingTransaction(null)}
        onSubmit={handleSubmit}
        transaction={editingTransaction}
      />
      <TransactionFilters accounts={accounts} categories={categories} filters={filters} onChange={setFilters} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ledger-muted">
          {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} in current view
        </p>
        <button
          type="button"
          onClick={handleExportCurrentView}
          disabled={isLoading}
          className="rounded-md border border-ledger-line bg-ledger-panel px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export current view
        </button>
      </div>
      {pageError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss">{pageError}</p> : null}
      {isLoading ? (
        <p className="text-sm text-ledger-muted">Loading transactions...</p>
      ) : (
        <TransactionList
          accounts={accounts}
          categories={categories}
          onDelete={handleDelete}
          onEdit={setEditingTransaction}
          transactions={transactions}
        />
      )}
    </section>
  );
}

function toRepositoryFilters(filters: TransactionFilterValues): RepositoryTransactionFilters {
  const repositoryFilters: RepositoryTransactionFilters = {};

  if (filters.accountId) {
    repositoryFilters.accountId = filters.accountId;
  }
  if (filters.categoryId) {
    repositoryFilters.categoryId = filters.categoryId;
  }
  if (filters.search.trim()) {
    repositoryFilters.search = filters.search.trim();
  }
  if (filters.month) {
    const [year, month] = filters.month.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    repositoryFilters.dateFrom = `${filters.month}-01`;
    repositoryFilters.dateTo = `${filters.month}-${String(lastDay).padStart(2, '0')}`;
  }

  return repositoryFilters;
}
