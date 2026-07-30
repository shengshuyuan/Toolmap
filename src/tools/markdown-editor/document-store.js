/**
 * Markdown 草稿本地存储（IndexedDB）
 */

import { createHistoryStore, isHistoryAvailable } from "../../shared/history-db.js";

export const MAX_DOCUMENTS = 40;
export const MAX_DOC_CHARS = 500_000;

/**
 * @typedef {{
 *  id: string,
 *  title: string,
 *  content: string,
 *  createdAt: number,
 *  updatedAt: number,
 * }} MdDocument
 */

/**
 * @returns {{
 *  available: boolean,
 *  list: () => Promise<MdDocument[]>,
 *  get: (id: string) => Promise<MdDocument|undefined>,
 *  save: (doc: Partial<MdDocument> & { content: string }) => Promise<MdDocument>,
 *  remove: (id: string) => Promise<void>,
 *  clear: () => Promise<void>,
 * } | null}
 */
export function createDocumentStore() {
  if (!isHistoryAvailable()) return null;
  const store = createHistoryStore({
    dbName: "toolmap-markdown",
    storeName: "documents",
    limit: MAX_DOCUMENTS,
  });

  return {
    available: true,
    list: async () => {
      const docs = await store.list();
      return docs.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    },
    get: (id) => store.get(id),
    async save(input) {
      const now = Date.now();
      const content = String(input.content ?? "").slice(0, MAX_DOC_CHARS);
      const title = String(input.title || extractTitle(content) || "未命名文档").slice(0, 120);
      /** @type {MdDocument} */
      const doc = {
        id: input.id || `${now}-${Math.random().toString(16).slice(2)}`,
        title,
        content,
        createdAt: input.createdAt || now,
        updatedAt: now,
      };
      await store.save(doc);
      return doc;
    },
    remove: (id) => store.remove(id),
    clear: () => store.clear(),
  };
}

/**
 * @param {string} content
 */
export function extractTitle(content) {
  const lines = String(content || "").split(/\n/);
  for (const line of lines) {
    const h = line.match(/^#\s+(.+)$/);
    if (h) return h[1].trim().slice(0, 80);
    if (line.trim()) return line.trim().slice(0, 40);
  }
  return "";
}

/**
 * 序列化（测试用）
 * @param {MdDocument} doc
 */
export function serializeDocument(doc) {
  return JSON.stringify({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

/**
 * @param {string} json
 * @returns {MdDocument}
 */
export function deserializeDocument(json) {
  const o = JSON.parse(json);
  if (!o || typeof o.content !== "string") throw new Error("无效文档");
  return {
    id: String(o.id || "unknown"),
    title: String(o.title || "未命名文档"),
    content: String(o.content).slice(0, MAX_DOC_CHARS),
    createdAt: Number(o.createdAt) || Date.now(),
    updatedAt: Number(o.updatedAt) || Date.now(),
  };
}
