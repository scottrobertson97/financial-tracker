import { FormEvent, useEffect, useState } from 'react';
import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';
import type { CreateTransactionInput } from './transactionRepository';
import type { Transaction, TransactionStatus } from './transactionTypes';
import { transactionStatuses } from './transactionTypes';
import { centsToDollars, dollarsToCents } from '../../shared/money';

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  isSubmitting: boolean;
  onCancelEdit: () => void;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
  transaction?: Transaction | null;
}

const statusLabels: Record<TransactionStatus, string> = {
  pending: 'Pending',
  cleared: 'Cleared',
  reconciled: 'Reconciled',
};

export function TransactionForm({
  accounts,
  categories,
  isSubmitting,
  onCancelEdit,
  onSubmit,
  transaction,
}: TransactionFormProps) {
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayInputDate());
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('cleared');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setAccountId(transaction?.accountId ?? accounts[0]?.id ?? '');
    setCategoryId(transaction?.categoryId ?? '');
    setDate(transaction?.date ?? getTodayInputDate());
    setDescription(transaction?.description ?? '');
    setMerchant(transaction?.merchant ?? '');
    setAmount(transaction ? centsToDollars(transaction.amountCents) : '');
    setStatus(transaction?.status ?? 'cleared');
    setNotes(transaction?.notes ?? '');
    setFormError(null);
  }, [accounts, transaction]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!accountId) {
      setFormError('Create an account before adding transactions.');
      return;
    }

    try {
      await onSubmit({
        accountId,
        categoryId: categoryId || null,
        date,
        description,
        merchant: merchant || null,
        amountCents: dollarsToCents(amount),
        notes: notes || null,
        status,
      });

      if (!transaction) {
        setCategoryId('');
        setDate(getTodayInputDate());
        setDescription('');
        setMerchant('');
        setAmount('');
        setStatus('cleared');
        setNotes('');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save transaction.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-ledger-line bg-ledger-panel p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Account</span>
          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="rounded-md border border-ledger-line px-3 py-2"
          >
            {accounts.length === 0 ? <option value="">No accounts</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="-12.34"
            className="rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TransactionStatus)}
            className="rounded-md border border-ledger-line px-3 py-2"
          >
            {transactionStatuses.map((transactionStatus) => (
              <option key={transactionStatus} value={transactionStatus}>
                {statusLabels[transactionStatus]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm xl:col-span-2">
          <span className="font-medium">Description</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Grocery run"
            className="rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Merchant</span>
          <input
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
            placeholder="Market"
            className="rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-md border border-ledger-line px-3 py-2"
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm xl:col-span-4">
          <span className="font-medium">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="resize-y rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isSubmitting || accounts.length === 0}
          className="rounded-md bg-ledger-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {transaction ? 'Save transaction' : 'Add transaction'}
        </button>
        {transaction ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
        ) : null}
      </div>
      {formError ? <p className="mt-3 text-sm text-ledger-loss">{formError}</p> : null}
    </form>
  );
}

function getTodayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
