import { FormEvent, useEffect, useState } from 'react';
import type { CreateAccountInput } from './accountRepository';
import type { Account, AccountType } from './accountTypes';
import { accountTypes } from './accountTypes';
import { centsToDollars, dollarsToCents } from '../../shared/money';

interface AccountFormProps {
  account?: Account | null;
  isSubmitting: boolean;
  onCancelEdit: () => void;
  onSubmit: (input: CreateAccountInput) => Promise<void>;
}

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  cash: 'Cash',
  investment: 'Investment',
  other: 'Other',
};

export function AccountForm({ account, isSubmitting, onCancelEdit, onSubmit }: AccountFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [startingBalance, setStartingBalance] = useState('0.00');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setName(account?.name ?? '');
    setType(account?.type ?? 'checking');
    setStartingBalance(account ? centsToDollars(account.startingBalanceCents) : '0.00');
    setFormError(null);
  }, [account]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      await onSubmit({
        name,
        type,
        startingBalanceCents: dollarsToCents(startingBalance),
      });
      if (!account) {
        setName('');
        setType('checking');
        setStartingBalance('0.00');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save account.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-ledger-line bg-ledger-panel p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Checking"
            className="rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as AccountType)}
            className="rounded-md border border-ledger-line px-3 py-2"
          >
            {accountTypes.map((accountType) => (
              <option key={accountType} value={accountType}>
                {accountTypeLabels[accountType]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Starting balance</span>
          <input
            value={startingBalance}
            onChange={(event) => setStartingBalance(event.target.value)}
            placeholder="0.00"
            className="rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-md bg-ledger-accent px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {account ? 'Save' : 'Add'}
          </button>
          {account ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-10 rounded-md border border-ledger-line px-4 text-sm font-medium"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
      {formError ? <p className="mt-3 text-sm text-ledger-loss">{formError}</p> : null}
    </form>
  );
}
