import { summarizeDiffLines } from "./summary.js";

export const TEXT_HISTORY_LIMIT = 30;
const DB_NAME = "toolmap-text-diff";
const DB_VERSION = 1;
const STORE_NAME = "history";
const encoder = new TextEncoder();

export function isTextHistoryAvailable() {
  return typeof indexedDB !== "undefined";
}

export function openTextHistoryDB() {
  if (!isTextHistoryAvailable()) return Promise.reject(new Error("当前浏览器不支持文本比对历史。"));

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
    request.onerror = () => reject(request.error || new Error("文本比对历史打开失败。"));
  });
}

export async function listTextHistory() {
  const db = await openTextHistoryDB();
  try {
    const records = await readAll(db);
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

export async function saveTextHistoryRecord(record) {
  const db = await openTextHistoryDB();
  try {
    await putRecord(db, record);
    await trimHistory(db, TEXT_HISTORY_LIMIT);
  } finally {
    db.close();
  }
}

export async function deleteTextHistoryRecord(id) {
  const db = await openTextHistoryDB();
  try {
    await txDone(db, "readwrite", (store) => store.delete(id));
  } finally {
    db.close();
  }
}

export async function clearTextHistory() {
  const db = await openTextHistoryDB();
  try {
    await txDone(db, "readwrite", (store) => store.clear());
  } finally {
    db.close();
  }
}

export function createTextHistoryRecord({ leftText, rightText, result }) {
  const lines = Array.isArray(result?.lines) ? result.lines : [];
  const left = String(leftText ?? "");
  const right = String(rightText ?? "");
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    leftText: left,
    rightText: right,
    summary: summarizeDiffLines(lines),
    totalLines: lines.length,
    diffCount: Number(result?.diffCount || 0),
    contentDiffCount: Number(result?.contentDiffCount || 0),
    formatDiffCount: Number(result?.formatDiffCount || 0),
    leftChars: left.length,
    rightChars: right.length,
  };
}

export function getTextHistoryUsage(records) {
  return records.reduce((sum, item) => {
    return sum + encoder.encode(item.leftText || "").length + encoder.encode(item.rightText || "").length;
  }, 0);
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
        request.onerror = () => reject(request.error || new Error("文本比对历史操作失败。"));
      }
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(requestResult);
    tx.onerror = () => reject(tx.error || new Error("文本比对历史事务失败。"));
    tx.onabort = () => reject(tx.error || new Error("文本比对历史事务已取消。"));
  });
}
