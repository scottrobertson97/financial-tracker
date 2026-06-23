const MONEY_PATTERN = /^([+-])?(?:(?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.(\d{1,2}))?$/;

export function dollarsToCents(input: string): number {
  const normalized = input.trim().replace(/^\$/, '');
  const match = normalized.match(MONEY_PATTERN);

  if (!match) {
    throw new Error(`Invalid money amount: ${input}`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  const unsigned = normalized.replace(/^[+-]/, '');
  const [dollarsPart, centsPart = ''] = unsigned.replaceAll(',', '').split('.');
  const dollars = Number.parseInt(dollarsPart, 10);
  const cents = Number.parseInt(centsPart.padEnd(2, '0'), 10) || 0;

  return sign * (dollars * 100 + cents);
}

export function centsToDollars(cents: number): string {
  assertIntegerCents(cents);

  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;

  return `${sign}${dollars}.${remainder.toString().padStart(2, '0')}`;
}

export function formatCurrency(cents: number): string {
  assertIntegerCents(cents);

  const absolute = Math.abs(cents);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(absolute / 100);

  return cents < 0 ? `-${formatted}` : formatted;
}

function assertIntegerCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Money values must be safe integer cents.');
  }
}
