// Storage for the sealed dynamic state (persistence v3). localStorage when the
// record fits the budget, IndexedDB otherwise or when localStorage refuses it
// (quota). A small pointer in localStorage records where the latest copy is.
// Each write replaces the previous copy; there is a single saved state.

export const STATE_LS_KEY = 'QICN_DYNAMIC_STATE_V3';
export const STATE_POINTER_KEY = 'QICN_DYNAMIC_STATE_V3_POINTER';
export const AUTO_RESTORE_KEY = 'QICN_AUTO_RESTORE';
// localStorage is shared with the ledger and the conversation (~5 MB total).
export const LOCAL_STORAGE_BUDGET_CHARS = 1_500_000;
const IDB_NAME = 'qicn-runtime';
const IDB_STORE = 'dynamic_state';
const IDB_KEY = 'latest';

const openDb = (indexedDB) => new Promise((resolve, reject) => {
  const request = indexedDB.open(IDB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const idbRequest = (db, mode, fn) => new Promise((resolve, reject) => {
  const tx = db.transaction(IDB_STORE, mode);
  const req = fn(tx.objectStore(IDB_STORE));
  tx.oncomplete = () => resolve(req?.result);
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

const env = (overrides = {}) => ({
  localStorage: 'localStorage' in overrides ? overrides.localStorage : (typeof window !== 'undefined' ? window.localStorage : null),
  indexedDB: 'indexedDB' in overrides ? overrides.indexedDB : (typeof indexedDB !== 'undefined' ? indexedDB : null)
});

const readPointer = (ls) => {
  try { return JSON.parse(ls?.getItem(STATE_POINTER_KEY) || 'null'); } catch { return null; }
};

/**
 * Write a sealed record. Returns { location, writeMs, blockingWriteMs }.
 * `blockingWriteMs` is the part that blocks the main thread (localStorage).
 */
export async function writeDynamicState({ text, digest, meta }, overrides = {}, clock = () => (globalThis.performance?.now?.() ?? 0)) {
  const { localStorage: ls, indexedDB: idb } = env(overrides);
  const t0 = clock();
  let location = null;
  let blockingWriteMs = 0;
  if (ls && text.length <= LOCAL_STORAGE_BUDGET_CHARS) {
    try {
      ls.setItem(STATE_LS_KEY, `${digest}\n${text}`);
      location = 'localStorage';
      blockingWriteMs = clock() - t0;
    } catch {
      location = null; // quota: fall through to IndexedDB
    }
  }
  if (!location && idb) {
    const db = await openDb(idb);
    try { await idbRequest(db, 'readwrite', (store) => store.put({ digest, text }, IDB_KEY)); } finally { db.close?.(); }
    location = 'indexedDB';
    try { ls?.removeItem(STATE_LS_KEY); } catch { /* best effort */ }
  }
  if (!location) throw new Error('no_storage_available');
  if (location === 'localStorage' && idb) {
    // Drop an older, larger copy so the pointer is the only truth.
    openDb(idb).then((db) => idbRequest(db, 'readwrite', (store) => store.delete(IDB_KEY)).finally(() => db.close?.())).catch(() => {});
  }
  try { ls?.setItem(STATE_POINTER_KEY, JSON.stringify({ location, digest, bytes: text.length, ...meta })); } catch { /* pointer optional */ }
  return { location, writeMs: clock() - t0, blockingWriteMs };
}

/** Read the latest record: { text, digest, location, pointer } or null. */
export async function readDynamicState(overrides = {}) {
  const { localStorage: ls, indexedDB: idb } = env(overrides);
  const pointer = readPointer(ls);
  const fromLs = () => {
    const raw = ls?.getItem(STATE_LS_KEY);
    if (!raw) return null;
    const cut = raw.indexOf('\n');
    return cut > 0 ? { digest: raw.slice(0, cut), text: raw.slice(cut + 1), location: 'localStorage' } : null;
  };
  const fromIdb = async () => {
    if (!idb) return null;
    const db = await openDb(idb);
    try {
      const rec = await idbRequest(db, 'readonly', (store) => store.get(IDB_KEY));
      return rec && typeof rec.text === 'string' ? { digest: rec.digest, text: rec.text, location: 'indexedDB' } : null;
    } finally { db.close?.(); }
  };
  const record = pointer?.location === 'indexedDB' ? (await fromIdb()) || fromLs() : fromLs() || (await fromIdb());
  return record ? { ...record, pointer } : null;
}

export async function clearDynamicState(overrides = {}) {
  const { localStorage: ls, indexedDB: idb } = env(overrides);
  try { ls?.removeItem(STATE_LS_KEY); ls?.removeItem(STATE_POINTER_KEY); } catch { /* best effort */ }
  if (idb) {
    try { const db = await openDb(idb); try { await idbRequest(db, 'readwrite', (store) => store.delete(IDB_KEY)); } finally { db.close?.(); } } catch { /* best effort */ }
  }
}
