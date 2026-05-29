/**
 * Shared IndexedDB history wrapper — used by text-diff and image-compress.
 *
 * Usage:
 *   import { createHistoryStore } from "../shared/history-db.js";
 *   const store = createHistoryStore({ dbName, storeName, limit });
 */

/**
 * @typedef {Object} HistoryStoreOptions
 * @property {string} dbName
 * @property {string} [storeName="history"]
 * @property {number} [limit=30]
 */

/**
 * @typedef {Object} HistoryStore
 * @property {() => Promise<Array<Object>>} list
 * @property {(id: string) => Promise<Object|undefined>} get
 * @property {(record: Object) => Promise<void>} save
 * @property {(id: string) => Promise<void>} remove
 * @property {() => Promise<void>} clear
 */

/** @returns {boolean} */
export function isHistoryAvailable() {
  return typeof indexedDB !== "undefined";
}

/**
 * @param {{ dbName?: string, storeName?: string, limit?: number }} [options]
 */
export function createHistoryStore({ dbName, storeName = "history", limit = 30 } = {}) {
  function openDB() {
    if (!isHistoryAvailable()) return Promise.reject(new Error("当前浏览器不支持历史记录。"));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("历史记录数据库打开失败。"));
    });
  }

  function txDone(db, mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let settled = false;
      let requestResult;
      function rejectOnce(err) {
        if (settled) return;
        settled = true;
        reject(err || new Error("历史记录操作失败。"));
      }
      function resolveOnce(val) {
        if (settled) return;
        settled = true;
        resolve(val);
      }
      try {
        const result = action(store);
        // 支持 action 返回单个 request 或 request 数组
        const requests = Array.isArray(result) ? result : result ? [result] : [];
        for (const req of requests) {
          if (req && typeof req.onerror === "object") {
            req.onerror = () => rejectOnce(req.error || new Error("历史记录操作失败。"));
          }
        }
        if (requests.length === 1) {
          requests[0].onsuccess = () => { requestResult = requests[0].result; };
        }
      } catch (err) {
        rejectOnce(err);
        return;
      }
      tx.oncomplete = () => resolveOnce(requestResult);
      tx.onerror = () => rejectOnce(tx.error || new Error("历史记录事务失败。"));
      tx.onabort = () => rejectOnce(tx.error || new Error("历史记录事务已取消。"));
    });
  }

  async function readAll(db) {
    return txDone(db, "readonly", (store) => store.getAll());
  }

  async function putRecord(db, record) {
    return txDone(db, "readwrite", (store) => store.put(record));
  }

  async function trimHistory(db) {
    const records = await readAll(db);
    const overflow = records.sort((a, b) => b.createdAt - a.createdAt).slice(limit);
    if (!overflow.length) return;
    await txDone(db, "readwrite", (store) => {
      const requests = [];
      for (const record of overflow) requests.push(store.delete(record.id));
      return requests;
    });
  }

  async function list() {
    const db = await openDB();
    try {
      const records = await readAll(db);
      return records.sort((a, b) => b.createdAt - a.createdAt);
    } finally {
      db.close();
    }
  }

  async function save(record) {
    const db = await openDB();
    try {
      await putRecord(db, record);
      await trimHistory(db);
    } catch (err) {
      if (err.name === "QuotaExceededError") {
        throw new Error("HISTORY_QUOTA_EXCEEDED");
      }
      throw err;
    } finally {
      db.close();
    }
  }

  async function remove(id) {
    const db = await openDB();
    try {
      await txDone(db, "readwrite", (store) => store.delete(id));
    } finally {
      db.close();
    }
  }

  async function clear() {
    const db = await openDB();
    try {
      await txDone(db, "readwrite", (store) => store.clear());
    } finally {
      db.close();
    }
  }

  async function get(id) {
    const db = await openDB();
    try {
      return await txDone(db, "readonly", (store) => store.get(id));
    } finally {
      db.close();
    }
  }

  return { list, get, save, remove, clear };
}
