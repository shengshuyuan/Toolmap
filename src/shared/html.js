/**
 * 默认转义的 HTML 模板标签。
 *
 * 用法：
 *   el.innerHTML = html`<p class="${cls}">${userText}</p>`;
 *
 * - 普通插值（字符串、数字等）一律经 escapeAttr 转义，文本节点与属性值内都安全
 * - 嵌套 html`` 的结果、raw() 包装的值原样插入
 * - 数组逐项处理后直接拼接，可用于 items.map((i) => html`<li>${i}</li>`)
 */

import { escapeAttr } from "./escape.js";

export class SafeHtml {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

/**
 * 标记一段已确认安全的 HTML（例如静态 SVG），不再转义。
 * @param {string} value
 */
export function raw(value) {
  return new SafeHtml(String(value ?? ""));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function renderValue(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join("");
  return escapeAttr(value);
}

/**
 * @param {TemplateStringsArray} strings
 * @param {...unknown} values
 * @returns {SafeHtml}
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += renderValue(values[i]) + strings[i + 1];
  }
  return new SafeHtml(out);
}
