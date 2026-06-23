import type { Account } from '../../features/accounts/accountTypes';
import type { AccountRepository, CreateAccountInput } from '../../features/accounts/accountRepository';
import { createId } from '../../shared/ids';
import type { SqliteClient, SqliteRow } from '../sqliteClient';

interface AccountRow extends SqliteRow {
  id: string;
  name: string;
  type: Account['type'];
  starting_balance_cents: number;
  created_at: string;
  updated_at: string;
}

export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly client: SqliteClient) {}

  async create(input: CreateAccountInput): Promise<Account> {
    const now = new Date().toISOString();
    const account: Account = {
      id: createId(),
      name: input.name,
      type: input.type,
      startingBalanceCents: input.startingBalanceCents,
      createdAt: now,
      updatedAt: now,
    };

    await this.client.execute(
      `INSERT INTO accounts (id, name, type, starting_balance_cents, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [account.id, account.name, account.type, account.startingBalanceCents, account.createdAt, account.updatedAt],
    );

    return account;
  }

  async update(id: string, input: Partial<CreateAccountInput>): Promise<Account> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Account not found.');
    }

    const updated: Account = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    await this.client.execute(
      `UPDATE accounts
       SET name = ?, type = ?, starting_balance_cents = ?, updated_at = ?
       WHERE id = ?`,
      [updated.name, updated.type, updated.startingBalanceCents, updated.updatedAt, id],
    );

    return updated;
  }

  async delete(id: string): Promise<void> {
    const dependentTransactions = this.client.queryOne<{ count: number }>(
      'SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?',
      [id],
    );
    if ((dependentTransactions?.count ?? 0) > 0) {
      throw new Error('Cannot delete an account that has transactions.');
    }

    await this.client.execute('DELETE FROM accounts WHERE id = ?', [id]);
  }

  async getById(id: string): Promise<Account | null> {
    const row = this.client.queryOne<AccountRow>(
      `SELECT id, name, type, starting_balance_cents, created_at, updated_at
       FROM accounts
       WHERE id = ?`,
      [id],
    );

    return row ? mapAccount(row) : null;
  }

  async list(): Promise<Account[]> {
    return this.client
      .queryAll<AccountRow>(
        `SELECT id, name, type, starting_balance_cents, created_at, updated_at
         FROM accounts
         ORDER BY name COLLATE NOCASE ASC`,
      )
      .map(mapAccount);
  }
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    startingBalanceCents: row.starting_balance_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
