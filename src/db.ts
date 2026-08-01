// ---------- IndexedDB wrapper (offline-first storage) ----------

import type { RockEntry } from "./types";

const DB_NAME = "rocklogger";
const DB_VERSION = 1;
const STORE = "rocks";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result: T | undefined;
        const req = fn(store);
        if (req) {
          req.onsuccess = () => {
            result = req.result as T;
          };
          req.onerror = () => reject(req.error);
        }
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
      })
  );
}

export async function getAllRocks(): Promise<RockEntry[]> {
  const rows = (await tx<RockEntry[]>("readonly", (s) => s.getAll())) ?? [];
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRock(id: string): Promise<RockEntry | undefined> {
  return tx<RockEntry>("readonly", (s) => s.get(id));
}

export async function putRock(entry: RockEntry): Promise<void> {
  await tx("readwrite", (s) => s.put(entry));
}

export async function deleteRock(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function exportAll(): Promise<RockEntry[]> {
  return getAllRocks();
}

export async function importAll(entries: RockEntry[]): Promise<number> {
  let count = 0;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    for (const e of entries) {
      if (e && e.id && e.name) {
        store.put(e);
        count++;
      }
    }
    t.oncomplete = () => resolve(count);
    t.onerror = () => reject(t.error);
  });
}
