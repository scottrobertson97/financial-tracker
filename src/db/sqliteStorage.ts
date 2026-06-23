export interface SqliteStorage {
  load(): Promise<Uint8Array | null>;
  save(data: Uint8Array): Promise<void>;
}

interface IndexedDbStorageOptions {
  databaseName?: string;
  key?: string;
  storeName?: string;
}

const DEFAULT_DATABASE_NAME = 'financial-tracker';
const DEFAULT_STORE_NAME = 'sqlite-files';
const DEFAULT_KEY = 'ledger';

export function createIndexedDbSqliteStorage(options: IndexedDbStorageOptions = {}): SqliteStorage {
  const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;
  const key = options.key ?? DEFAULT_KEY;

  return {
    async load() {
      if (!globalThis.indexedDB) {
        return null;
      }

      const db = await openDatabase(databaseName, storeName);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const request = transaction.objectStore(storeName).get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result as Uint8Array | ArrayBuffer | null | undefined;
          if (!result) {
            resolve(null);
            return;
          }
          resolve(result instanceof Uint8Array ? new Uint8Array(result) : new Uint8Array(result));
        };
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => reject(transaction.error);
      });
    },
    async save(data) {
      if (!globalThis.indexedDB) {
        return;
      }

      const db = await openDatabase(databaseName, storeName);

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const request = transaction.objectStore(storeName).put(new Uint8Array(data), key);

        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      });
    },
  };
}

export function createMemorySqliteStorage(initialData?: Uint8Array): SqliteStorage {
  let storedData = initialData ? new Uint8Array(initialData) : null;

  return {
    async load() {
      return storedData ? new Uint8Array(storedData) : null;
    },
    async save(data) {
      storedData = new Uint8Array(data);
    },
  };
}

function openDatabase(databaseName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}
