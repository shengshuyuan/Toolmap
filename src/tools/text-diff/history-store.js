import { summarizeDiffLines } from "./summary.js";
import { createIdbStore } from "../../shared/idb-store.js";

export const TEXT_HISTORY_LIMIT = 30;

const store = createIdbStore({
  dbName: "toolmap-text-diff",
  errorMessage: "文本比对历史",
});

const encoder = new TextEncoder();

export const isTextHistoryAvailable = () => store.isAvailable();
export const openTextHistoryDB = () => store.openDB();
export const listTextHistory = () => store.list();
export const saveTextHistoryRecord = (record) => store.save(record, TEXT_HISTORY_LIMIT);
export const deleteTextHistoryRecord = (id) => store.remove(id);
export const clearTextHistory = () => store.clear();

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
