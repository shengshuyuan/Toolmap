/**
 * Shared toast utility — works with any existing toast element.
 *
 * Usage:
 *   import { createToast } from "../shared/toast.js";
 *   const showToast = createToast(elToast, { showClass: "toast--show", duration: 3500 });
 *   showToast("操作成功");
 */
/**
 * @typedef {Object} ToastOptions
 * @property {string} [showClass="toast--show"]
 * @property {number} [duration=3500]
 */

/**
 * @param {HTMLElement} el
 * @param {ToastOptions} [options]
 * @returns {(text: string) => void}
 */
export function createToast(el, { showClass = "toast--show", duration = 3500 } = {}) {
  let timer = 0;
  return function showToast(text) {
    window.clearTimeout(timer);
    el.textContent = text;
    el.classList.add(showClass);
    timer = window.setTimeout(() => el.classList.remove(showClass), duration);
  };
}
