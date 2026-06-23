import type { Account } from './accountTypes';
import { formatCurrency } from '../../shared/money';

interface AccountListProps {
  accounts: Account[];
  onDelete: (account: Account) => void;
  onEdit: (account: Account) => void;
}

export function AccountList({ accounts, onDelete, onEdit }: AccountListProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-ledger-line bg-ledger-panel">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-ledger-muted">
          <tr>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Name</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Type</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Starting balance</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Updated</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-ledger-muted">
                No accounts yet.
              </td>
            </tr>
          ) : (
            accounts.map((account) => (
              <tr key={account.id} className="border-b border-ledger-line last:border-b-0">
                <td className="px-4 py-3 font-medium">{account.name}</td>
                <td className="px-4 py-3 capitalize text-ledger-muted">{account.type}</td>
                <td className="px-4 py-3">{formatCurrency(account.startingBalanceCents)}</td>
                <td className="px-4 py-3 text-ledger-muted">
                  {new Date(account.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(account)}
                      className="rounded-md border border-ledger-line px-3 py-1.5 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(account)}
                      className="rounded-md border border-ledger-line px-3 py-1.5 text-sm font-medium text-ledger-loss"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
