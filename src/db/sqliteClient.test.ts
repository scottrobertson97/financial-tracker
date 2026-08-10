import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSqliteClient } from './sqliteClient';
import type { SqliteStorage } from './sqliteStorage';

const sqlWasmPath = join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');

describe('SqliteClient persistence failures', () => {
  it('restores the pre-transaction state and remains usable when the outer flush fails', async () => {
    const storage = new ControlledStorage();
    const client = await createSqliteClient({ locateFile: () => sqlWasmPath, storage });
    storage.failNextSave();

    await expect(client.transaction(async () => {
      await client.execute(
        'INSERT INTO app_metadata (key, value) VALUES (?, ?)',
        ['failed-transaction', 'should roll back'],
      );
    })).rejects.toThrow('Simulated persistence failure');

    expect(readMetadata(client, 'failed-transaction')).toBeNull();

    await client.transaction(async () => {
      await client.execute(
        'INSERT INTO app_metadata (key, value) VALUES (?, ?)',
        ['successful-transaction', 'persisted'],
      );
    });

    expect(readMetadata(client, 'successful-transaction')).toBe('persisted');
    client.close();

    const reopened = await createSqliteClient({ locateFile: () => sqlWasmPath, storage });
    expect(readMetadata(reopened, 'failed-transaction')).toBeNull();
    expect(readMetadata(reopened, 'successful-transaction')).toBe('persisted');
    reopened.close();
  });

  it('keeps the original database active when persisting a validated restore fails', async () => {
    const source = await createSqliteClient({ locateFile: () => sqlWasmPath, storage: null });
    await source.execute(
      'INSERT INTO app_metadata (key, value) VALUES (?, ?)',
      ['replacement-only', 'replacement'],
    );
    const backup = source.export();
    source.close();

    const storage = new ControlledStorage();
    const client = await createSqliteClient({ locateFile: () => sqlWasmPath, storage });
    await client.execute(
      'INSERT INTO app_metadata (key, value) VALUES (?, ?)',
      ['original-only', 'original'],
    );
    storage.failNextSave();

    await expect(client.replaceWith(backup)).rejects.toThrow('Simulated persistence failure');

    expect(readMetadata(client, 'original-only')).toBe('original');
    expect(readMetadata(client, 'replacement-only')).toBeNull();

    await client.execute(
      'INSERT INTO app_metadata (key, value) VALUES (?, ?)',
      ['after-failure', 'still usable'],
    );
    client.close();

    const reopened = await createSqliteClient({ locateFile: () => sqlWasmPath, storage });
    expect(readMetadata(reopened, 'original-only')).toBe('original');
    expect(readMetadata(reopened, 'replacement-only')).toBeNull();
    expect(readMetadata(reopened, 'after-failure')).toBe('still usable');
    reopened.close();
  });
});

function readMetadata(client: Awaited<ReturnType<typeof createSqliteClient>>, key: string): string | null {
  return client.queryOne<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    [key],
  )?.value ?? null;
}

class ControlledStorage implements SqliteStorage {
  private data: Uint8Array | null = null;
  private shouldFailNextSave = false;

  async load(): Promise<Uint8Array | null> {
    return this.data ? new Uint8Array(this.data) : null;
  }

  async save(data: Uint8Array): Promise<void> {
    if (this.shouldFailNextSave) {
      this.shouldFailNextSave = false;
      throw new Error('Simulated persistence failure');
    }

    this.data = new Uint8Array(data);
  }

  failNextSave(): void {
    this.shouldFailNextSave = true;
  }
}
