import type { Category } from './categoryTypes';

interface CategoryListProps {
  categories: Category[];
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
}

export function CategoryList({ categories, onDelete, onEdit }: CategoryListProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-ledger-line bg-ledger-panel">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-ledger-muted">
          <tr>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Name</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Type</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Color</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Updated</th>
            <th className="border-b border-ledger-line px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-ledger-muted">
                No categories yet.
              </td>
            </tr>
          ) : (
            categories.map((category) => (
              <tr key={category.id} className="border-b border-ledger-line last:border-b-0">
                <td className="px-4 py-3 font-medium">{category.name}</td>
                <td className="px-4 py-3 capitalize text-ledger-muted">{category.type}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 rounded-sm border border-ledger-line"
                      style={{ backgroundColor: category.color ?? '#64748b' }}
                    />
                    <span className="text-ledger-muted">{category.color ?? 'None'}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-ledger-muted">
                  {new Date(category.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(category)}
                      className="rounded-md border border-ledger-line px-3 py-1.5 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(category)}
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
