import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';

export interface TransactionFilterValues {
  accountId: string;
  categoryId: string;
  month: string;
  search: string;
}

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
  filters: TransactionFilterValues;
  onChange: (filters: TransactionFilterValues) => void;
}

export function TransactionFilters({ accounts, categories, filters, onChange }: TransactionFiltersProps) {
  function updateFilter(key: keyof TransactionFilterValues, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid gap-3 rounded-md border border-ledger-line bg-ledger-panel p-4 md:grid-cols-[1fr_180px_180px_140px_auto]">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Search</span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="Description, merchant, notes"
          className="rounded-md border border-ledger-line px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Account</span>
        <select
          value={filters.accountId}
          onChange={(event) => updateFilter('accountId', event.target.value)}
          className="rounded-md border border-ledger-line px-3 py-2"
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Category</span>
        <select
          value={filters.categoryId}
          onChange={(event) => updateFilter('categoryId', event.target.value)}
          className="rounded-md border border-ledger-line px-3 py-2"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Month</span>
        <input
          type="month"
          value={filters.month}
          onChange={(event) => updateFilter('month', event.target.value)}
          className="rounded-md border border-ledger-line px-3 py-2"
        />
      </label>
      <div className="flex items-end">
        <button
          type="button"
          onClick={() => onChange({ accountId: '', categoryId: '', month: '', search: '' })}
          className="h-10 rounded-md border border-ledger-line px-4 text-sm font-medium"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
