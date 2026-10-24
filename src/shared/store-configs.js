/**
 * 各工具本地 IndexedDB 存储配置的唯一来源。
 * 工具自身的 history-store / document-store 与跨工具的 recent-index 都从这里取值，
 * 避免库名、store 名或条数上限在多处硬编码而不一致。
 */

/**
 * @typedef {{ dbName: string, storeName: string, limit: number }} StoreConfig
 */

/** @type {Readonly<Record<"text-diff" | "markdown-editor" | "image-compress" | "qrcode", StoreConfig>>} */
export const STORE_CONFIGS = Object.freeze({
  "text-diff": Object.freeze({ dbName: "toolmap-text-diff", storeName: "history", limit: 30 }),
  "markdown-editor": Object.freeze({ dbName: "toolmap-markdown", storeName: "documents", limit: 40 }),
  "image-compress": Object.freeze({ dbName: "toolmap-image-compress", storeName: "history", limit: 30 }),
  "qrcode": Object.freeze({ dbName: "toolmap-qrcode", storeName: "history", limit: 30 }),
});
