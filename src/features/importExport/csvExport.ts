import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import { centsToDollars } from '../../shared/money';

const CSV_COLUMNS = ['date', 'account', 'description', 'merchant', 'category', 'amount', 'status', 'notes'] as const;

export function transactionsToCsv(transactions: Transaction[], accounts: Account[], categories: Category[]): string {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const rows = transactions.map((transaction) => [
    transaction.date,
    accountNames.get(transaction.accountId) ?? '',
    transaction.description,
    transaction.merchant ?? '',
    transaction.categoryId ? categoryNames.get(transaction.categoryId) ?? '' : '',
    centsToDollars(transaction.amountCents),
    transaction.status,
    transaction.notes ?? '',
  ]);

  return [CSV_COLUMNS, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
}

export function escapeCsvValue(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
