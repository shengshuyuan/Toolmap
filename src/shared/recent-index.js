/**
 * 跨工具最近使用索引与本地存储数据管理
 *
 * 聚合 text-diff、markdown-editor、image-compress、qrcode 四个工具的本地存储
 * 遵循 Section 6：索引不强行复制大正文/大 Blob，由各工具原库存储，提供统一 RecentItem 视口。
 */

import { createHistoryStore, isHistoryAvailable } from "./history-db.js";
import { formatBytes } from "./format.js";

/**
 * @typedef {{
 *   id: string,
 *   toolId: string,
 *   toolLabel: string,
 *   recordId: string,
 *   title: string,
 *   summary: string,
 *   updatedAt: number,
 *   status: string,
 *   restorable: boolean,
 *   raw?: any
 * }} RecentItem
 */

const STORES = {
  "text-diff": () =>
    createHistoryStore({ dbName: "toolmap-text-diff", storeName: "history", limit: 30 }),
  "markdown-editor": () =>
    createHistoryStore({ dbName: "toolmap-markdown", storeName: "documents", limit: 40 }),
  "image-compress": () =>
    createHistoryStore({ dbName: "toolmap-image-compress", storeName: "history", limit: 30 }),
  "qrcode": () =>
    createHistoryStore({ dbName: "toolmap-qrcode", storeName: "history", limit: 30 }),
};

/**
 * 获取所有工具的最近记录并归一化
 * @returns {Promise<RecentItem[]>}
 */
export async function listAllRecentRecords() {
  if (!isHistoryAvailable()) return [];

  const results = [];

  // 1. Text Diff
  try {
    const textStore = STORES["text-diff"]();
    const textRecords = await textStore.list();
    for (const r of textRecords) {
      const summaryText = r.summary || (r.diffCount ? `${r.diffCount} 处差异` : "无差异");
      results.push({
        id: `td-${r.id}`,
        toolId: "text-diff",
        toolLabel: "文本比对",
        recordId: r.id,
        title: r.leftText ? r.leftText.split("\n")[0].slice(0, 36) || "文本比对记录" : "文本比对记录",
        summary: summaryText,
        updatedAt: r.createdAt || Date.now(),
        status: r.diffCount ? `${r.diffCount} 处修改` : "内容一致",
        restorable: true,
        raw: r,
      });
    }
  } catch (err) {
    console.warn("[recent-index] text-diff list failed:", err);
  }

  // 2. Markdown Editor
  try {
    const mdStore = STORES["markdown-editor"]();
    const mdRecords = await mdStore.list();
    for (const r of mdRecords) {
      results.push({
        id: `md-${r.id}`,
        toolId: "markdown-editor",
        toolLabel: "Markdown",
        recordId: r.id,
        title: r.title || "未命名文档",
        summary: "本地草稿",
        updatedAt: r.updatedAt || r.createdAt || Date.now(),
        status: "草稿",
        restorable: true,
        raw: r,
      });
    }
  } catch (err) {
    console.warn("[recent-index] markdown list failed:", err);
  }

  // 3. Image Compress
  try {
    const imgStore = STORES["image-compress"]();
    const imgRecords = await imgStore.list();
    for (const r of imgRecords) {
      const savedRatio = r.result?.savedRatio ?? r.savedRatio;
      results.push({
        id: `img-${r.id}`,
        toolId: "image-compress",
        toolLabel: "图片压缩",
        recordId: r.id,
        title: r.originalName || r.outputName || "压缩图片",
        summary: r.outputName ? `输出: ${r.outputName}` : "本地处理",
        updatedAt: r.createdAt || Date.now(),
        status: typeof savedRatio === "number" && savedRatio > 0 ? `体积减少 ${savedRatio}%` : "已完成",
        restorable: false,
        raw: r,
      });
    }
  } catch (err) {
    console.warn("[recent-index] image-compress list failed:", err);
  }

  // 4. QR Code
  try {
    const qrStore = STORES["qrcode"]();
    const qrRecords = await qrStore.list();
    for (const r of qrRecords) {
      const content = String(r.text || "").trim();
      results.push({
        id: `qr-${r.id}`,
        toolId: "qrcode",
        toolLabel: "二维码",
        recordId: r.id,
        title: content.slice(0, 36) || (r.type === "wifi" ? "WiFi 二维码" : "二维码"),
        summary: r.type ? `类型: ${r.type}` : "本地生成",
        updatedAt: r.createdAt || Date.now(),
        status: "已生成",
        restorable: false,
        raw: r,
      });
    }
  } catch (err) {
    console.warn("[recent-index] qrcode list failed:", err);
  }

  // 按更新时间倒序排序
  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 获取最近一个可真正恢复继续编辑的草稿/记录
 * @returns {Promise<RecentItem|null>}
 */
export async function getLatestRestorableDraft() {
  const list = await listAllRecentRecords();
  return list.find((item) => item.restorable) ?? null;
}

/**
 * 删除某工具的某条历史记录
 * @param {string} toolId
 * @param {string} recordId
 */
export async function deleteRecentRecord(toolId, recordId) {
  const storeFactory = STORES[toolId];
  if (!storeFactory) return;
  const store = storeFactory();
  await store.remove(recordId);
}

/**
 * 统计本地存储使用情况
 */
export async function getStorageEstimate() {
  if (!isHistoryAvailable()) {
    return {
      available: false,
      tools: [],
      totalRecords: 0,
      totalBytesEstimate: 0,
      formattedTotal: "0 B",
    };
  }

  const encoder = new TextEncoder();
  const toolsInfo = [];
  let totalRecords = 0;
  let totalBytes = 0;

  for (const [toolId, getStore] of Object.entries(STORES)) {
    try {
      const store = getStore();
      const records = await store.list();
      let bytes = 0;
      for (const item of records) {
        try {
          const json = JSON.stringify(item);
          bytes += encoder.encode(json).length;
        } catch (_) {
          bytes += 500;
        }
      }
      totalRecords += records.length;
      totalBytes += bytes;
      toolsInfo.push({
        toolId,
        label: toolId === "text-diff" ? "文本比对" : toolId === "markdown-editor" ? "Markdown" : toolId === "image-compress" ? "图片压缩" : "二维码",
        count: records.length,
        bytes,
        formattedBytes: formatBytes(bytes),
      });
    } catch (err) {
      console.warn(`[recent-index] storage estimate failed for ${toolId}:`, err);
    }
  }

  return {
    available: true,
    tools: toolsInfo,
    totalRecords,
    totalBytesEstimate: totalBytes,
    formattedTotal: formatBytes(totalBytes),
  };
}

/**
 * 导出全站数据为 JSON 备份
 */
export async function exportAllBackupData() {
  if (!isHistoryAvailable()) throw new Error("当前环境不支持导出。");

  const backup = {
    app: "Toolmap",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    stores: {},
  };

  for (const [toolId, getStore] of Object.entries(STORES)) {
    try {
      const store = getStore();
      backup.stores[toolId] = await store.list();
    } catch (_) {
      backup.stores[toolId] = [];
    }
  }

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `toolmap-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * 导入 JSON 备份数据到本地各存储
 * @param {any} backupData
 * @returns {Promise<{ success: boolean, importedCount: number }>}
 */
export async function importBackupData(backupData) {
  if (!backupData || typeof backupData !== "object" || backupData.app !== "Toolmap") {
    throw new Error("无效的备份文件：必须是 Toolmap 导出的 JSON 备份文件。");
  }
  if (!backupData.stores || typeof backupData.stores !== "object") {
    throw new Error("无效的备份文件：缺少 stores 数据。");
  }
  if (!isHistoryAvailable()) throw new Error("当前浏览器环境不支持本地存储。");

  let importedCount = 0;
  for (const [toolId, records] of Object.entries(backupData.stores)) {
    const storeFactory = STORES[toolId];
    if (!storeFactory || !Array.isArray(records)) continue;
    const store = storeFactory();
    for (const record of records) {
      if (!record || typeof record !== "object") continue;
      try {
        await store.save(record);
        importedCount++;
      } catch (err) {
        console.warn(`[recent-index] import failed for ${toolId}:`, err);
      }
    }
  }

  return { success: true, importedCount };
}

/**
 * 清空所有工具的本地历史数据
 */
export async function clearAllLocalData() {
  if (!isHistoryAvailable()) return;
  for (const getStore of Object.values(STORES)) {
    try {
      const store = getStore();
      await store.clear();
    } catch (err) {
      console.warn("[recent-index] clear failed:", err);
    }
  }
}
