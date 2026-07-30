/**
 * 从 Markdown 提取标题大纲
 */

import { slugify } from "./renderer.js";

/**
 * @typedef {{ level: number, text: string, id: string, line: number }} OutlineItem
 */

/**
 * @param {string} markdown
 * @returns {OutlineItem[]}
 */
export function buildOutline(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  /** @type {OutlineItem[]} */
  const items = [];
  let inCode = false;
  const used = new Map();

  lines.forEach((line, idx) => {
    if (/^```/.test(line.trim())) {
      inCode = !inCode;
      return;
    }
    if (inCode) return;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) return;
    const level = m[1].length;
    const text = m[2].replace(/#+\s*$/, "").trim();
    let id = slugify(text);
    const n = (used.get(id) || 0) + 1;
    used.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    items.push({ level, text, id, line: idx + 1 });
  });

  return items;
}
