import type { ReactNode } from 'react';

interface ReportTableDisclosureProps {
  children: ReactNode;
  label?: string;
}

export function ReportTableDisclosure({
  children,
  label = 'Show exact data',
}: ReportTableDisclosureProps) {
  return (
    <details className="rounded-md border border-ledger-line bg-slate-50">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-ledger-muted hover:text-ledger-ink">
        {label}
      </summary>
      <div className="overflow-x-auto border-t border-ledger-line p-3">
        {children}
      </div>
    </details>
  );
}
