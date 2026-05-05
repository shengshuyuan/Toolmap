/**
 * Creates a reusable IndexedDB store interface.
 * @param {{ dbName: string, dbVersion?: number, storeName?: string, errorMessage?: string }} options
 */
export function createIdbStore(options) {
  const { dbName, dbVersion = 1, storeName = "history", errorMessage = "操作失败" } = options;

  let availabilityCache = undefined;

  function isAvailable() {
    if (availabilityCache !== undefined) return availabilityCache;
    availabilityCache = typeof indexedDB !== "undefined";
    return availabilityCache;
  }

  function openDB() {
    if (!isAvailable()) return Promise.reject(new Error("当前浏览器不支持历史记录缓存。"));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(errorMessage));
    });
  }

  function txDone(db, mode, action) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let requestResult;
      try {
        const request = action(store);
        if (request) {
          request.onsuccess = () => {
            requestResult = request.result;
          };
          request.onerror = () => reject(request.error || new Error(errorMessage));
        }
      } catch (err) {
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve(requestResult);
      tx.onerror = () => reject(tx.error || new Error(errorMessage + "事务失败。"));
      tx.onabort = () => reject(tx.error || new Error(errorMessage + "事务已取消。"));
    });
  }

  function readAll(db) {
    return txDone(db, "readonly", (store) => store.getAll());
  }

  function putRecord(db, record) {
    return txDone(db, "readwrite", (store) => store.put(record));
  }

  async function trimHistory(db, limit) {
    const records = await readAll(db);
    const overflow = records.sort((a, b) => b.createdAt - a.createdAt).slice(limit);
    if (!overflow.length) return;
    await txDone(db, "readwrite", (store) => {
      for (const record of overflow) store.delete(record.id);
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

  async function save(record, limit) {
    const db = await openDB();
    try {
      await putRecord(db, record);
      await trimHistory(db, limit);
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

  return { isAvailable, openDB, list, save, remove, clear };
}
