/**
 * Shared history export — download history records as JSON.
 *
 * Usage:
 *   import { exportTextHistory } from "../shared/history-export.js";
 *   await exportTextHistory(records);
 */
import { APP_VERSION } from "../config/app-meta.js";

/**
 * @param {string} toolId
 * @param {Array<Object>} records
 * @param {{ version?: string }} [options]
 * @returns {{ toolmapVersion: string, exportedAt: string, tool: string, count: number, records: Array<Object> }}
 */
export function buildExportPayload(toolId, records, { version = APP_VERSION } = {}) {
  return {
    toolmapVersion: version,
    exportedAt: new Date().toISOString(),
    tool: toolId,
    count: records.length,
    records,
  };
}

/**
 * @param {Object} payload
 * @param {string} filename
 */
export function downloadJSON(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {Object} record
 * @returns {Object}
 */
function sanitizeTextRecord(record) {
  const { id, createdAt, leftText, rightText, summary,
    totalLines, diffCount, contentDiffCount, formatDiffCount,
    leftChars, rightChars } = record;
  return { id, createdAt, leftText, rightText, summary,
    totalLines, diffCount, contentDiffCount, formatDiffCount,
    leftChars, rightChars };
}

/**
 * @param {Object} record
 * @returns {Promise<Object>}
 */
async function sanitizeImageRecord(record) {
  const { id, createdAt, originalName, outputName, originalSize, outputSize,
    savedRatio, originalType, outputType, originalWidth, originalHeight,
    outputWidth, outputHeight, blob } = record;
  let imageData = null;
  if (blob instanceof Blob) {
    imageData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return { id, createdAt, originalName, outputName, originalSize, outputSize,
    savedRatio, originalType, outputType, originalWidth, originalHeight,
    outputWidth, outputHeight, imageData };
}

/**
 * @param {Array<Object>} records
 * @param {{ version?: string }} [options]
 */
export async function exportTextHistory(records, options) {
  const sanitized = records.map(sanitizeTextRecord);
  const payload = buildExportPayload("text-diff", sanitized, options);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadJSON(payload, `toolmap-text-diff-history-${ts}.json`);
}

/**
 * @param {Array<Object>} records
 * @param {{ version?: string }} [options]
 */
export async function exportImageHistory(records, options) {
  const sanitized = [];
  for (const record of records) {
    sanitized.push(await sanitizeImageRecord(record));
  }
  const payload = buildExportPayload("image-compress", sanitized, options);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadJSON(payload, `toolmap-image-history-${ts}.json`);
}
