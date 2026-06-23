import { FormEvent, useEffect, useState } from 'react';
import type { CreateCategoryInput } from './categoryRepository';
import type { Category, CategoryType } from './categoryTypes';
import { categoryTypes } from './categoryTypes';

interface CategoryFormProps {
  category?: Category | null;
  isSubmitting: boolean;
  onCancelEdit: () => void;
  onSubmit: (input: CreateCategoryInput) => Promise<void>;
}

const categoryTypeLabels: Record<CategoryType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

export function CategoryForm({ category, isSubmitting, onCancelEdit, onSubmit }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState('#64748b');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setName(category?.name ?? '');
    setType(category?.type ?? 'expense');
    setColor(category?.color ?? '#64748b');
    setFormError(null);
  }, [category]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    try {
      await onSubmit({ name, type, color });
      if (!category) {
        setName('');
        setType('expense');
        setColor('#64748b');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save category.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-ledger-line bg-ledger-panel p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_120px_auto]">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Groceries"
            className="rounded-md border border-ledger-line px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as CategoryType)}
            className="rounded-md border border-ledger-line px-3 py-2"
          >
            {categoryTypes.map((categoryType) => (
              <option key={categoryType} value={categoryType}>
                {categoryTypeLabels[categoryType]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Color</span>
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-10 rounded-md border border-ledger-line p-1"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-md bg-ledger-accent px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {category ? 'Save' : 'Add'}
          </button>
          {category ? (
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
