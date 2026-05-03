export const HISTORY_LIMIT = 30;
const DB_NAME = "toolmap-image-compress";
const DB_VERSION = 1;
const STORE_NAME = "history";

export function isHistoryAvailable() {
  return typeof indexedDB !== "undefined";
}

export function openHistoryDB() {
  if (!isHistoryAvailable()) return Promise.reject(new Error("当前浏览器不支持历史记录缓存。"));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("历史记录数据库打开失败。"));
  });
}

export async function listHistory() {
  const db = await openHistoryDB();
  try {
    const records = await readAll(db);
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

export async function saveHistoryRecord(record) {
  const db = await openHistoryDB();
  try {
    await putRecord(db, record);
    await trimHistory(db, HISTORY_LIMIT);
  } finally {
    db.close();
  }
}

export async function deleteHistoryRecord(id) {
  const db = await openHistoryDB();
  try {
    await txDone(db, "readwrite", (store) => store.delete(id));
  } finally {
    db.close();
  }
}

export async function clearHistory() {
  const db = await openHistoryDB();
  try {
    await txDone(db, "readwrite", (store) => store.clear());
  } finally {
    db.close();
  }
}

export function getHistoryUsage(records) {
  return records.reduce((sum, item) => sum + (item.outputSize || item.blob?.size || 0), 0);
}

export function createHistoryRecord(item) {
  const result = item.result;
  if (!result?.blob) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    originalName: item.file.name,
    outputName: result.fileName,
    originalSize: item.file.size,
    outputSize: result.outputSize,
    savedRatio: result.savedRatio,
    originalType: item.file.type,
    outputType: result.type,
    originalWidth: item.meta.width || null,
    originalHeight: item.meta.height || null,
    outputWidth: result.width,
    outputHeight: result.height,
    blob: result.blob,
  };
}

async function trimHistory(db, limit) {
  const records = await readAll(db);
  const overflow = records.sort((a, b) => b.createdAt - a.createdAt).slice(limit);
  if (!overflow.length) return;
  await txDone(db, "readwrite", (store) => {
    for (const record of overflow) store.delete(record.id);
  });
}

function readAll(db) {
  return txDone(db, "readonly", (store) => store.getAll());
}

function putRecord(db, record) {
  return txDone(db, "readwrite", (store) => store.put(record));
}

function txDone(db, mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let requestResult;
    try {
      const request = action(store);
      if (request) {
        request.onsuccess = () => {
          requestResult = request.result;
        };
        request.onerror = () => reject(request.error || new Error("历史记录操作失败。"));
      }
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(requestResult);
    tx.onerror = () => reject(tx.error || new Error("历史记录事务失败。"));
    tx.onabort = () => reject(tx.error || new Error("历史记录事务已取消。"));
  });
}
