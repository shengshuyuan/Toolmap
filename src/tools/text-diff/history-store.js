import { summarizeDiffLines } from "./summary.js";
import { createHistoryStore, isHistoryAvailable } from "../../shared/history-db.js";
import { STORE_CONFIGS } from "../../shared/store-configs.js";

export const TEXT_HISTORY_LIMIT = STORE_CONFIGS["text-diff"].limit;
export { isHistoryAvailable as isTextHistoryAvailable };

const encoder = new TextEncoder();
const store = createHistoryStore(STORE_CONFIGS["text-diff"]);

export function openTextHistoryDB() {
  return /** @type {any} */ (store)._openDB?.() ?? Promise.reject(new Error("不支持的操作。"));
}

export const listTextHistory = () => store.list();
/** @param {Object} record */
export const saveTextHistoryRecord = (record) => store.save(record);
/** @param {string} id */
export const deleteTextHistoryRecord = (id) => store.remove(id);
export const clearTextHistory = () => store.clear();

/**
 * @param {{ leftText: string, rightText: string, result: { lines?: import("./diff.js").DiffLine[], diffCount?: number, contentDiffCount?: number, formatDiffCount?: number } }} params
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

/** @param {Array<{ leftText?: string, rightText?: string }>} records @returns {number} */
export function getTextHistoryUsage(records) {
  return records.reduce((sum, item) => {
    return sum + encoder.encode(item.leftText || "").length + encoder.encode(item.rightText || "").length;
  }, 0);
}
