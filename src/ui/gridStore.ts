// Keeps the grid in the browser's IndexedDB (ADR 0015), so it is there on the next visit.
// One record, replaced on every save: the book of lines (ADR 0017).
import { parseBook, type SavedBook } from './savedBook';

export interface GridStore {
  load(): Promise<SavedBook | undefined>;
  save(book: SavedBook): Promise<void>;
  clear(): Promise<void>;
}

const STORE = 'grid';
const KEY = 'current';

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function open(name: string): Promise<IDBDatabase> {
  const request = indexedDB.open(name, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  return done(request);
}

/** The grid store in the database with this name. */
export function openGridStore(name = 'candy-planner'): GridStore {
  const db = open(name);
  const run = async <T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>) =>
    done(act((await db).transaction(STORE, mode).objectStore(STORE)));
  return {
    load: async () => parseBook(await run('readonly', (s) => s.get(KEY))),
    save: async (book) => void (await run('readwrite', (s) => s.put(book, KEY))),
    clear: async () => void (await run('readwrite', (s) => s.delete(KEY))),
  };
}
