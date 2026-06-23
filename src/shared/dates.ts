export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

export function isDateInMonth(dateIso: string, monthKey: string): boolean {
  return dateIso.startsWith(`${monthKey}-`);
}
