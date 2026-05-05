import { createIdbStore } from "../../shared/idb-store.js";

export const HISTORY_LIMIT = 30;

const store = createIdbStore({
  dbName: "toolmap-image-compress",
  errorMessage: "历史记录",
});

export const isHistoryAvailable = () => store.isAvailable();
export const openHistoryDB = () => store.openDB();
export const listHistory = () => store.list();
export const saveHistoryRecord = (record) => store.save(record, HISTORY_LIMIT);
export const deleteHistoryRecord = (id) => store.remove(id);
export const clearHistory = () => store.clear();

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

export function getHistoryUsage(records) {
  return records.reduce((sum, item) => sum + (item.outputSize || item.blob?.size || 0), 0);
}
