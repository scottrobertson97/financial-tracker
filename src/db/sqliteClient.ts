import initSqlJs, { type BindParams, type Database, type ParamsObject, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import initialSchema from '../../db/migrations/001_initial_schema.sql?raw';
import { createIndexedDbSqliteStorage, type SqliteStorage } from './sqliteStorage';

export type SqliteRow = ParamsObject;

export interface CreateSqliteClientOptions {
  locateFile?: (fileName: string) => string;
  storage?: SqliteStorage | null;
}

export class SqliteClient {
  private transactionDepth = 0;

  constructor(
    private db: Database,
    private readonly storage: SqliteStorage | null,
    private readonly sqlJs: SqlJsStatic,
  ) {}

  async execute(sql: string, params?: BindParams): Promise<void> {
    this.db.run(sql, params);
    await this.persistIfNeeded();
  }

  queryAll<T extends SqliteRow>(sql: string, params?: BindParams): T[] {
    const statement = this.db.prepare(sql);
    const rows: T[] = [];

    try {
      if (params) {
        statement.bind(params);
      }
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }
    } finally {
      statement.free();
    }

    return rows;
  }

  queryOne<T extends SqliteRow>(sql: string, params?: BindParams): T | null {
    return this.queryAll<T>(sql, params)[0] ?? null;
  }

  async transaction<T>(work: () => Promise<T> | T): Promise<T> {
    const isOuterTransaction = this.transactionDepth === 0;
    if (isOuterTransaction) {
      this.db.run('BEGIN IMMEDIATE');
    }
    this.transactionDepth += 1;

    try {
      const result = await work();
      this.transactionDepth -= 1;
      if (isOuterTransaction) {
        this.db.run('COMMIT');
        await this.flush();
      }
      return result;
    } catch (error) {
      this.transactionDepth -= 1;
      if (isOuterTransaction) {
        this.db.run('ROLLBACK');
      }
      throw error;
    }
  }

  async flush(): Promise<void> {
    if (this.storage) {
      await this.storage.save(this.db.export());
    }
  }

  export(): Uint8Array {
    return this.db.export();
  }

  async replaceWith(data: Uint8Array): Promise<void> {
    if (this.transactionDepth > 0) {
      throw new Error('Cannot restore a database backup while a transaction is active.');
    }

    const replacement = new this.sqlJs.Database(data);

    try {
      replacement.run('PRAGMA foreign_keys = ON');
      replacement.run(initialSchema);
      replacement.exec('SELECT id, name, type, starting_balance_cents, created_at, updated_at FROM accounts LIMIT 1');
      replacement.exec('SELECT id, name, type, color, created_at, updated_at FROM categories LIMIT 1');
      replacement.exec(
        'SELECT id, account_id, category_id, date, description, merchant, amount_cents, notes, status, created_at, updated_at FROM transactions LIMIT 1',
      );
    } catch (error) {
      replacement.close();
      throw new Error(error instanceof Error ? `Invalid database backup: ${error.message}` : 'Invalid database backup.');
    }

    const previous = this.db;
    this.db = replacement;
    previous.close();
    await this.flush();
  }

  close(): void {
    this.db.close();
  }

  private async persistIfNeeded(): Promise<void> {
    if (this.transactionDepth === 0) {
      await this.flush();
    }
  }
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

export async function createSqliteClient(options: CreateSqliteClientOptions = {}): Promise<SqliteClient> {
  const SQL = await loadSqlJs(options.locateFile);
  const persistedData = await options.storage?.load();
  const db = new SQL.Database(persistedData ?? undefined);
  db.run('PRAGMA foreign_keys = ON');
  db.run(initialSchema);

  const client = new SqliteClient(db, options.storage ?? null, SQL);
  await client.flush();

  return client;
}

export function createBrowserSqliteClient(): Promise<SqliteClient> {
  return createSqliteClient({ storage: createIndexedDbSqliteStorage() });
}

function loadSqlJs(locateFile?: (fileName: string) => string): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: locateFile ?? (() => wasmUrl),
    });
  }

  return sqlJsPromise;
}
