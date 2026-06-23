import { useEffect, useState } from 'react';
import { useAppServices } from '../appServicesContext';
import { PageHeader } from '../shared/PageHeader';
import { AccountForm } from '../../features/accounts/AccountForm';
import { AccountList } from '../../features/accounts/AccountList';
import type { CreateAccountInput } from '../../features/accounts/accountRepository';
import type { Account } from '../../features/accounts/accountTypes';

export function AccountsPage() {
  const { accounts: accountService } = useAppServices();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function loadAccounts() {
    setIsLoading(true);
    setPageError(null);
    try {
      setAccounts(await accountService.list());
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load accounts.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(input: CreateAccountInput) {
    setIsSubmitting(true);
    setPageError(null);
    try {
      if (editingAccount) {
        await accountService.update(editingAccount.id, input);
        setEditingAccount(null);
      } else {
        await accountService.create(input);
      }
      await loadAccounts();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(account: Account) {
    setPageError(null);
    try {
      await accountService.delete(account.id);
      if (editingAccount?.id === account.id) {
        setEditingAccount(null);
      }
      await loadAccounts();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to delete account.');
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Accounts"
        eyebrow="Sources"
        description="Checking, savings, credit card, cash, and other accounts will be managed here."
      />
      <AccountForm
        account={editingAccount}
        isSubmitting={isSubmitting}
        onCancelEdit={() => setEditingAccount(null)}
        onSubmit={handleSubmit}
      />
      {pageError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-ledger-loss">{pageError}</p> : null}
      {isLoading ? (
        <p className="text-sm text-ledger-muted">Loading accounts...</p>
      ) : (
        <AccountList accounts={accounts} onDelete={handleDelete} onEdit={setEditingAccount} />
      )}
    </section>
  );
}
