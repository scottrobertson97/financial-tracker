import { useEffect, useState } from 'react';
import type { BudgetOverviewRow } from './budgetOverview';
import { centsToDollars, dollarsToCents, formatCurrency } from '../../shared/money';

interface BudgetCategoryTableProps {
  month: string;
  onDelete: (categoryId: string) => Promise<void>;
  onSave: (categoryId: string, amountCents: number) => Promise<void>;
  rows: BudgetOverviewRow[];
}

export function BudgetCategoryTable({ month, onDelete, onSave, rows }: BudgetCategoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-ledger-line bg-ledger-panel">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <caption className="sr-only">Expense category budgets and actual spending for {month}</caption>
        <thead className="bg-slate-50 text-ledger-muted">
          <tr>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Category</th>
            <th className="border-b border-ledger-line px-4 py-3 text-right font-medium">Actual</th>
            <th className="border-b border-ledger-line px-4 py-3 text-right font-medium">Remaining</th>
            <th className="border-b border-ledger-line px-4 py-3 text-right font-medium">Used</th>
            <th className="border-b border-ledger-line px-4 py-3 text-right font-medium">6-month average</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Monthly budget</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-ledger-muted">
                No expense categories yet. Add an expense category before creating a budget.
              </td>
            </tr>
          ) : rows.map((row) => (
            <BudgetCategoryRow
              key={`${month}-${row.categoryId}`}
              month={month}
              onDelete={onDelete}
              onSave={onSave}
              row={row}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface BudgetCategoryRowProps extends Omit<BudgetCategoryTableProps, 'rows'> {
  row: BudgetOverviewRow;
}

function BudgetCategoryRow({ month, onDelete, onSave, row }: BudgetCategoryRowProps) {
  const [amount, setAmount] = useState(row.budgetCents === null ? '' : centsToDollars(row.budgetCents));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAmount(row.budgetCents === null ? '' : centsToDollars(row.budgetCents));
    setError(null);
  }, [month, row.budgetCents]);

  async function save() {
    setError(null);
    setIsSubmitting(true);
    try {
      const amountCents = dollarsToCents(amount);
      if (amountCents <= 0) {
        throw new Error('Enter an amount greater than zero.');
      }
      await onSave(row.categoryId, amountCents);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Unable to save budget.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onDelete(row.categoryId);
      setAmount('');
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : 'Unable to remove budget.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <tr className="border-b border-ledger-line align-top last:border-b-0">
      <th className="px-4 py-4 font-medium">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ backgroundColor: row.color }} />
          {row.categoryName}
        </span>
      </th>
      <td className="px-4 py-4 text-right font-medium">{formatCurrency(row.actualCents)}</td>
      <td className={`px-4 py-4 text-right font-medium ${
        row.remainingCents !== null && row.remainingCents < 0 ? 'text-ledger-loss' : ''
      }`}>
        {row.remainingCents === null ? '—' : formatCurrency(row.remainingCents)}
      </td>
      <td className="px-4 py-4 text-right">
        {row.percentageUsed === null ? '—' : (
          <span className={row.percentageUsed > 100 ? 'font-medium text-ledger-loss' : ''}>
            {formatPercentage(row.percentageUsed)}
          </span>
        )}
      </td>
      <td className="px-4 py-4 text-right">
        <p>{formatCurrency(row.historicalAverageCents)}</p>
        {row.historicalAverageCents > 0 ? (
          <button
            className="mt-1 text-xs font-medium text-ledger-accent hover:underline"
            onClick={() => setAmount(centsToDollars(row.historicalAverageCents))}
            type="button"
          >
            Use average
          </button>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex min-w-64 flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Budget for {row.categoryName}</span>
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-2 text-ledger-muted">$</span>
            <input
              aria-describedby={error ? `budget-error-${row.categoryId}` : undefined}
              className="w-28 rounded-md border border-ledger-line py-1.5 pl-6 pr-2"
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              value={amount}
            />
          </label>
          <button
            className="rounded-md bg-ledger-accent px-3 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => void save()}
            type="button"
          >
            Save
          </button>
          {row.budgetCents !== null ? (
            <button
              className="rounded-md border border-ledger-line px-3 py-1.5 font-medium text-ledger-loss disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => void remove()}
              type="button"
            >
              Remove
            </button>
          ) : null}
        </div>
        {error ? <p id={`budget-error-${row.categoryId}`} className="mt-2 text-xs text-ledger-loss">{error}</p> : null}
      </td>
    </tr>
  );
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
