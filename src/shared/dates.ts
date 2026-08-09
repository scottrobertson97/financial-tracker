export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

export function getCurrentDateIso(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');

  return `${getCurrentMonthKey(date)}-${day}`;
}

export function getMonthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

export function getMonthKeysEndingAt(monthKey: string, count: number): string[] {
  const { monthIndex, year } = parseMonthKey(monthKey);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex - count + index + 1, 1));
    return formatMonthKey(date.getUTCFullYear(), date.getUTCMonth());
  });
}

export function getPreviousMonthKey(monthKey: string): string {
  return getMonthKeysEndingAt(monthKey, 2)[0];
}

export function getDaysInMonth(monthKey: string): number {
  const { monthIndex, year } = parseMonthKey(monthKey);
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function getMonthEndDate(monthKey: string): string {
  return `${monthKey}-${String(getDaysInMonth(monthKey)).padStart(2, '0')}`;
}

export function formatMonthLabel(monthKey: string): string {
  const { monthIndex, year } = parseMonthKey(monthKey);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function isDateInMonth(dateIso: string, monthKey: string): boolean {
  return dateIso.startsWith(`${monthKey}-`);
}

function parseMonthKey(monthKey: string): { monthIndex: number; year: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  return { monthIndex, year };
}

function formatMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}
