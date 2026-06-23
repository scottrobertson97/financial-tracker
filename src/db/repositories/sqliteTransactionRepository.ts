import type { Transaction } from '../../features/transactions/transactionTypes';
import type {
  CreateTransactionInput,
  TransactionFilters,
  TransactionRepository,
  UpdateTransactionInput,
} from '../../features/transactions/transactionRepository';
import { createId } from '../../shared/ids';
import type { SqliteClient, SqliteRow } from '../sqliteClient';

interface TransactionRow extends SqliteRow {
  id: string;
  account_id: string;
  category_id: string | null;
  date: string;
  description: string;
  merchant: string | null;
  amount_cents: number;
  notes: string | null;
  status: Transaction['status'];
  created_at: string;
  updated_at: string;
}

export class SqliteTransactionRepository implements TransactionRepository {
  constructor(private readonly client: SqliteClient) {}

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const now = new Date().toISOString();
    const transaction: Transaction = {
      id: createId(),
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      date: input.date,
      description: input.description,
      merchant: input.merchant ?? null,
      amountCents: input.amountCents,
      notes: input.notes ?? null,
      status: input.status ?? 'cleared',
      createdAt: now,
      updatedAt: now,
    };

    await this.client.execute(
      `INSERT INTO transactions (
         id, account_id, category_id, date, description, merchant, amount_cents, notes, status, created_at, updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.id,
        transaction.accountId,
        transaction.categoryId ?? null,
        transaction.date,
        transaction.description,
        transaction.merchant ?? null,
        transaction.amountCents,
        transaction.notes ?? null,
        transaction.status,
        transaction.createdAt,
        transaction.updatedAt,
      ],
    );

    return transaction;
  }

  async update(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Transaction not found.');
    }

    const updated: Transaction = {
      ...existing,
      ...input,
      categoryId: input.categoryId === undefined ? existing.categoryId : input.categoryId,
      merchant: input.merchant === undefined ? existing.merchant : input.merchant,
      notes: input.notes === undefined ? existing.notes : input.notes,
      status: input.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };

    await this.client.execute(
      `UPDATE transactions
       SET account_id = ?, category_id = ?, date = ?, description = ?, merchant = ?,
           amount_cents = ?, notes = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.accountId,
        updated.categoryId ?? null,
        updated.date,
        updated.description,
        updated.merchant ?? null,
        updated.amountCents,
        updated.notes ?? null,
        updated.status,
        updated.updatedAt,
        id,
      ],
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.client.execute('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async getById(id: string): Promise<Transaction | null> {
    const row = this.client.queryOne<TransactionRow>(
      `SELECT id, account_id, category_id, date, description, merchant, amount_cents, notes, status, created_at, updated_at
       FROM transactions
       WHERE id = ?`,
      [id],
    );

    return row ? mapTransaction(row) : null;
  }

  async list(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const where: string[] = [];
    const params: Array<number | string | null> = [];

    if (filters.accountId) {
      where.push('account_id = ?');
      params.push(filters.accountId);
    }
    if (filters.categoryId) {
      where.push('category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.dateFrom) {
      where.push('date >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.push('date <= ?');
      params.push(filters.dateTo);
    }
    if (filters.search?.trim()) {
      where.push(
        `(LOWER(description) LIKE LOWER(?)
          OR LOWER(COALESCE(merchant, '')) LIKE LOWER(?)
          OR LOWER(COALESCE(notes, '')) LIKE LOWER(?))`,
      );
      const searchTerm = `%${filters.search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return this.client
      .queryAll<TransactionRow>(
        `SELECT id, account_id, category_id, date, description, merchant, amount_cents, notes, status, created_at, updated_at
         FROM transactions
         ${whereClause}
         ORDER BY date DESC, created_at DESC`,
        params,
      )
      .map(mapTransaction);
  }
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id,
    date: row.date,
    description: row.description,
    merchant: row.merchant,
    amountCents: row.amount_cents,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
