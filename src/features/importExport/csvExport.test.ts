import { describe, expect, it } from 'vitest';
import type { Account } from '../accounts/accountTypes';
import type { Category } from '../categories/categoryTypes';
import type { Transaction } from '../transactions/transactionTypes';
import { escapeCsvValue, transactionsToCsv } from './csvExport';

const accounts: Account[] = [
  {
    id: 'checking',
    name: 'Main, Checking',
    type: 'checking',
    startingBalanceCents: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

const categories: Category[] = [
  {
    id: 'groceries',
    name: 'Groceries',
    type: 'expense',
    color: '#15803d',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

const transactions: Transaction[] = [
  {
    id: 'market',
    accountId: 'checking',
    categoryId: 'groceries',
    amountCents: -1234,
    createdAt: '2026-06-23T12:00:00.000Z',
    date: '2026-06-23',
    description: 'Market, bulk "beans"',
    merchant: 'Local Market',
    notes: 'Line one\nLine two',
    status: 'cleared',
    updatedAt: '2026-06-23T12:00:00.000Z',
  },
];

describe('CSV export', () => {
  it('escapes CSV values with commas, quotes, and newlines', () => {
    expect(escapeCsvValue('plain')).toBe('plain');
    expect(escapeCsvValue('Main, Checking')).toBe('"Main, Checking"');
    expect(escapeCsvValue('bulk "beans"')).toBe('"bulk ""beans"""');
    expect(escapeCsvValue('Line one\nLine two')).toBe('"Line one\nLine two"');
  });

  it('serializes transactions with display dollars instead of raw cents', () => {
    expect(transactionsToCsv(transactions, accounts, categories)).toBe(
      [
        'date,account,description,merchant,category,amount,status,notes',
        '2026-06-23,"Main, Checking","Market, bulk ""beans""",Local Market,Groceries,-12.34,cleared,"Line one\nLine two"',
      ].join('\r\n'),
    );
  });
});
