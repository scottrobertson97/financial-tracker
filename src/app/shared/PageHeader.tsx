interface PageHeaderProps {
  title: string;
  eyebrow: string;
  description: string;
}

export function PageHeader({ title, eyebrow, description }: PageHeaderProps) {
  return (
    <header className="border-b border-ledger-line pb-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ledger-muted">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-ledger-muted">{description}</p>
    </header>
  );
}
