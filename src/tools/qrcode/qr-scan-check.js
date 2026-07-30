/**
 * 生成结果本地回读自检
 */

import { contrastRatio, collectStyleWarnings, DEFAULT_MARGIN, WARN_LOGO_RATIO } from "./qr-style.js";

/**
 * @typedef {"pass"|"warn"|"fail"} ScanCheckLevel
 * @typedef {{ level: ScanCheckLevel, status: string, details: string[] }} ScanCheckResult
 */

/**
 * @param {object} params
 * @param {string} params.expected
 * @param {string|null} [params.decoded]
 * @param {object} params.style
 * @param {Error|null} [params.error]
 * @returns {ScanCheckResult}
 */
export function evaluateScanCheck({ expected, decoded, style, error = null }) {
  const details = collectStyleWarnings(style, { hasContent: Boolean(expected) });
  const ratio = contrastRatio(style?.foreground || "#000", style?.background || "#fff");

  if (error) {
    return {
      level: "fail",
      status: "自动识别失败，请调整设置",
      details: [...details, error.message || "识别过程异常"],
    };
  }

  if (!expected) {
    return { level: "warn", status: "请输入内容后生成", details };
  }

  if (decoded == null) {
    return {
      level: "fail",
      status: "自动识别失败，请调整设置",
      details: details.length ? details : ["当前样式可能影响识别"],
    };
  }

  if (decoded !== expected) {
    return {
      level: "fail",
      status: "自动识别失败，请调整设置",
      details: ["回读内容与原文不一致", ...details],
    };
  }

  if (details.length > 0) {
    // 有警告但解码成功
    let status = "当前样式可能影响识别";
    if (details.some((d) => d.includes("对比度"))) status = "对比度可能不足";
    else if (details.some((d) => d.includes("Logo"))) status = "Logo 可能过大";
    else if (details.some((d) => d.includes("留白"))) status = "安全留白不足";
    return { level: "warn", status, details };
  }

  if (ratio < 4.5) {
    return {
      level: "warn",
      status: "对比度可能不足",
      details: [`对比度约 ${ratio.toFixed(1)}:1`],
    };
  }

  return {
    level: "pass",
    status: "识别测试通过",
    details: [],
  };
}

/**
 * 从 canvas 取 ImageData 供 jsQR 使用（Node 环境不可用）
 * @param {HTMLCanvasElement} canvas
 */
export function getCanvasImageData(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * 简化状态文案用于 UI class
 * @param {ScanCheckLevel} level
 */
export function scanCheckClass(level) {
  if (level === "pass") return "qr-check--pass";
  if (level === "fail") return "qr-check--fail";
  return "qr-check--warn";
}

export { DEFAULT_MARGIN, WARN_LOGO_RATIO };
