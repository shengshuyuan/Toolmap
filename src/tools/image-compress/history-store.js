import { createHistoryStore, isHistoryAvailable } from "../../shared/history-db.js";
import { STORE_CONFIGS } from "../../shared/store-configs.js";

export const HISTORY_LIMIT = STORE_CONFIGS["image-compress"].limit;
export { isHistoryAvailable };

const store = createHistoryStore(STORE_CONFIGS["image-compress"]);

/**
 * 列出所有历史记录，剥离 blob 以节省内存（列表只展示元数据）
 * @returns {Promise<Array<import("./utils.js").HistoryMeta>>}
 */
export async function listHistoryMeta() {
  const records = await store.list();
  return records.map(stripBlob);
}

/** 按 ID 获取单条完整记录（含 blob），用于按需下载 */
/** @param {string} id */
export const getHistoryRecord = (id) => store.get(id);

/** @param {Object} record */
export const saveHistoryRecord = (record) => store.save(record);
/** @param {string} id */
export const deleteHistoryRecord = (id) => store.remove(id);
export const clearHistory = () => store.clear();

/** @param {Array<{ outputSize?: number }>} records @returns {number} */
export function getHistoryUsage(records) {
  return records.reduce((sum, item) => sum + (item.outputSize || 0), 0);
}

/** @param {any} record */
function stripBlob(record) {
  const { blob, ...meta } = record;
  return meta;
}

/** @param {import("./utils.js").ImageItem} item @returns {Object|null} */
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
