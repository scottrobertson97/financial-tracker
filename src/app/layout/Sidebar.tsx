import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Categories', to: '/categories' },
  { label: 'Import/Export', to: '/import-export' },
] as const;

export function Sidebar() {
  return (
    <aside className="border-b border-ledger-line bg-ledger-panel md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col gap-5 px-4 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ledger-muted">
            Local Ledger
          </p>
          <h1 className="mt-1 text-xl font-semibold">Financial Tracker</h1>
        </div>
        <nav aria-label="Primary navigation" className="flex flex-wrap gap-2 md:flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-ledger-accent text-white'
                    : 'text-ledger-ink hover:bg-slate-100',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
