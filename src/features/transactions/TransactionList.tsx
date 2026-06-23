import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from './transactionTypes';
import { formatCurrency } from '../../shared/money';

interface TransactionListProps {
  accounts: Account[];
  categories: Category[];
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  transactions: Transaction[];
}

export function TransactionList({ accounts, categories, onDelete, onEdit, transactions }: TransactionListProps) {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="overflow-x-auto rounded-md border border-ledger-line bg-ledger-panel">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-ledger-muted">
          <tr>
            {['Date', 'Description', 'Merchant', 'Account', 'Category', 'Amount', 'Status', 'Actions'].map(
              (heading) => (
                <th key={heading} className="border-b border-ledger-line px-4 py-3 font-medium">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-ledger-muted">
                No transactions match the current filters.
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-ledger-line last:border-b-0">
                <td className="px-4 py-3">{transaction.date}</td>
                <td className="px-4 py-3 font-medium">{transaction.description}</td>
                <td className="px-4 py-3 text-ledger-muted">{transaction.merchant || '-'}</td>
                <td className="px-4 py-3">{accountNames.get(transaction.accountId) ?? 'Unknown'}</td>
                <td className="px-4 py-3">{transaction.categoryId ? categoryNames.get(transaction.categoryId) ?? 'Unknown' : '-'}</td>
                <td className={transaction.amountCents < 0 ? 'px-4 py-3 text-ledger-loss' : 'px-4 py-3 text-ledger-gain'}>
                  {formatCurrency(transaction.amountCents)}
                </td>
                <td className="px-4 py-3 capitalize text-ledger-muted">{transaction.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(transaction)}
                      className="rounded-md border border-ledger-line px-3 py-1.5 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(transaction)}
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
