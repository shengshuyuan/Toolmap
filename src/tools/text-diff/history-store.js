import { summarizeDiffLines } from "./summary.js";
import { createHistoryStore, isHistoryAvailable } from "../../shared/history-db.js";

export const TEXT_HISTORY_LIMIT = 30;
export { isHistoryAvailable as isTextHistoryAvailable };

const encoder = new TextEncoder();
const store = createHistoryStore({
  dbName: "toolmap-text-diff",
  storeName: "history",
  limit: TEXT_HISTORY_LIMIT,
});

export function openTextHistoryDB() {
  return store._openDB?.() ?? Promise.reject(new Error("不支持的操作。"));
}

export const listTextHistory = () => store.list();
export const saveTextHistoryRecord = (record) => store.save(record);
export const deleteTextHistoryRecord = (id) => store.remove(id);
export const clearTextHistory = () => store.clear();

/**
 * @param {{ leftText: string, rightText: string, result: Object }} params
 * @returns {Object}
 */
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

/** @param {Array<Object>} records @returns {number} */
export function getTextHistoryUsage(records) {
  return records.reduce((sum, item) => {
    return sum + encoder.encode(item.leftText || "").length + encoder.encode(item.rightText || "").length;
  }, 0);
}
