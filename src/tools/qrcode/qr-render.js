/**
 * QR Code 渲染器 — Canvas / SVG，支持外框与 Logo
 */

import { clampLogoRatio, DEFAULT_MARGIN } from "./qr-style.js";

/**
 * @typedef {object} RenderDesignOptions
 * @property {string} [foreground]
 * @property {string} [background]
 * @property {number} [margin]
 * @property {number} [pixelSize] 输出边长（含外框）
 * @property {object} [frame]
 * @property {object} [logo]
 */

/**
 * 计算模块区与画布布局
 * @param {boolean[][]} modules
 * @param {RenderDesignOptions} options
 */
export function computeLayout(modules, options = {}) {
  const moduleCount = modules.length;
  const margin = options.margin ?? DEFAULT_MARGIN;
  const qrModules = moduleCount + margin * 2;
  const frame = options.frame || {};
  const frameOn = Boolean(frame.enabled);
  const frameWidth = frameOn ? Math.max(0, Number(frame.width) || 0) : 0;
  const framePadding = frameOn ? Math.max(0, Number(frame.padding) || 0) : 0;
  const radius = frameOn ? Math.max(0, Number(frame.radius) || 0) : 0;

  // 像素目标边长（最终输出）
  const target = Math.max(64, Math.round(Number(options.pixelSize) || 512));

  // 内层内容（二维码模块 + 装饰内边距 + 边框）占 target
  const outerPad = frameWidth * 2 + framePadding * 2;
  const qrPixel = Math.max(1, target - outerPad);
  const cellSize = qrPixel / qrModules;
  const qrSize = qrModules * cellSize;
  const contentSize = qrSize + framePadding * 2;
  const totalSize = contentSize + frameWidth * 2;

  // 若浮点导致偏差，缩放至 target
  const scale = target / totalSize;
  return {
    moduleCount,
    margin,
    cellSize: cellSize * scale,
    qrSize: qrSize * scale,
    frameWidth: frameWidth * scale,
    framePadding: framePadding * scale,
    radius: radius * scale,
    contentSize: contentSize * scale,
    totalSize: target,
    frameOn,
    frameColor: frame.color || "#141413",
    frameBg: frame.background || "#ffffff",
    qrOffset: (frameWidth + framePadding) * scale,
  };
}

/**
 * 绘制圆角矩形路径
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * 在 Canvas 上绘制 QR Code（基础，兼容旧 API）
 * @param {HTMLCanvasElement} canvas
 * @param {boolean[][]} modules
 * @param {{ cellSize?: number, foreground?: string, background?: string, margin?: number }} [options]
 */
export function renderToCanvas(canvas, modules, options = {}) {
  const cellSize = options.cellSize || 4;
  const fg = options.foreground || "#000000";
  const bg = options.background || "#ffffff";
  const margin = options.margin ?? DEFAULT_MARGIN;
  const size = modules.length;
  const totalSize = (size + margin * 2) * cellSize;

  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, totalSize, totalSize);

  ctx.fillStyle = fg;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        ctx.fillRect((c + margin) * cellSize, (r + margin) * cellSize, cellSize, cellSize);
      }
    }
  }
}

/**
 * 设计版渲染：外框 + Logo + 精确输出尺寸
 * @param {HTMLCanvasElement} canvas
 * @param {boolean[][]} modules
 * @param {RenderDesignOptions} options
 * @returns {Promise<void>}
 */
export async function renderDesignedCanvas(canvas, modules, options = {}) {
  const layout = computeLayout(modules, options);
  const fg = options.foreground || "#000000";
  const bg = options.background || "#ffffff";
  const { totalSize, cellSize, margin, moduleCount, qrOffset, frameOn, frameWidth, framePadding, radius, contentSize, frameColor, frameBg, qrSize } = layout;

  canvas.width = Math.round(totalSize);
  canvas.height = Math.round(totalSize);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 画布外背景（透明区域用白底保证扫码）
  ctx.fillStyle = frameOn ? frameBg : bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (frameOn) {
    // 外框描边区域
    roundRectPath(ctx, 0, 0, totalSize, totalSize, radius);
    ctx.fillStyle = frameColor;
    ctx.fill();

    // 内层背景（圆角只裁装饰底，不裁二维码）
    const inner = frameWidth;
    const innerSize = totalSize - frameWidth * 2;
    const innerRadius = Math.max(0, radius - frameWidth);
    roundRectPath(ctx, inner, inner, innerSize, innerSize, innerRadius);
    ctx.fillStyle = frameBg;
    ctx.fill();

    // 二维码底板
    ctx.fillStyle = bg;
    ctx.fillRect(qrOffset, qrOffset, qrSize, qrSize);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, totalSize, totalSize);
  }

  // 模块
  ctx.fillStyle = fg;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (modules[r][c]) {
        const x = qrOffset + (c + margin) * cellSize;
        const y = qrOffset + (r + margin) * cellSize;
        ctx.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }

  // Logo
  const logo = options.logo;
  if (logo?.enabled && logo.dataUrl) {
    await drawLogo(ctx, logo, qrOffset, qrSize);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} logo
 * @param {number} qrOffset
 * @param {number} qrSize
 */
async function drawLogo(ctx, logo, qrOffset, qrSize) {
  const img = await loadImageElement(logo.dataUrl);
  const ratio = clampLogoRatio(logo.sizeRatio);
  const box = qrSize * ratio;
  const pad = Math.max(0, Number(logo.padding) || 0);
  const radius = Math.max(0, Number(logo.radius) || 0);
  const cx = qrOffset + (qrSize - box) / 2;
  const cy = qrOffset + (qrSize - box) / 2;
  const bg = logo.background || "#ffffff";

  // Logo 底板（避免透明与二维码混叠）
  ctx.save();
  roundRectPath(ctx, cx, cy, box, box, radius);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.clip();

  const fit = logo.fit === "cover" ? "cover" : "contain";
  const avail = Math.max(1, box - pad * 2);
  const scale =
    fit === "cover"
      ? Math.max(avail / img.width, avail / img.height)
      : Math.min(avail / img.width, avail / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = cx + (box - dw) / 2;
  const dy = cy + (box - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("当前环境不支持图片绘制"));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo 图片加载失败"));
    img.src = src;
  });
}

/**
 * 生成 SVG 字符串（基础，兼容旧 API）
 * @param {boolean[][]} modules
 * @param {{ foreground?: string, background?: string, margin?: number }} [options]
 * @returns {string}
 */
export function renderToSVG(modules, options = {}) {
  const fg = escapeSvgColor(options.foreground || "#000000");
  const bg = escapeSvgColor(options.background || "#ffffff");
  const margin = options.margin ?? DEFAULT_MARGIN;
  const size = modules.length;
  const totalSize = size + margin * 2;

  let paths = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        paths += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">` +
    `<rect width="${totalSize}" height="${totalSize}" fill="${bg}"/>` +
    `<path d="${paths}" fill="${fg}"/>` +
    `</svg>`
  );
}

/**
 * 设计版 SVG：含外框与 Logo（data URL image，无脚本）
 * @param {boolean[][]} modules
 * @param {RenderDesignOptions} options
 * @returns {string}
 */
export function renderDesignedSVG(modules, options = {}) {
  const layout = computeLayout(modules, options);
  const fg = escapeSvgColor(options.foreground || "#000000");
  const bg = escapeSvgColor(options.background || "#ffffff");
  const {
    totalSize, cellSize, margin, moduleCount, qrOffset, frameOn,
    frameWidth, radius, frameColor, frameBg, qrSize,
  } = layout;

  let paths = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (modules[r][c]) {
        const x = qrOffset + (c + margin) * cellSize;
        const y = qrOffset + (r + margin) * cellSize;
        paths += `M${x},${y}h${cellSize}v${cellSize}h${-cellSize}z`;
      }
    }
  }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(totalSize)}" height="${Math.round(totalSize)}" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">`,
  ];

  if (frameOn) {
    parts.push(`<rect width="${totalSize}" height="${totalSize}" rx="${radius}" ry="${radius}" fill="${escapeSvgColor(frameColor)}"/>`);
    const inner = frameWidth;
    const innerSize = totalSize - frameWidth * 2;
    const innerR = Math.max(0, radius - frameWidth);
    parts.push(`<rect x="${inner}" y="${inner}" width="${innerSize}" height="${innerSize}" rx="${innerR}" ry="${innerR}" fill="${escapeSvgColor(frameBg)}"/>`);
    parts.push(`<rect x="${qrOffset}" y="${qrOffset}" width="${qrSize}" height="${qrSize}" fill="${bg}"/>`);
  } else {
    parts.push(`<rect width="${totalSize}" height="${totalSize}" fill="${bg}"/>`);
  }

  parts.push(`<path d="${paths}" fill="${fg}"/>`);

  const logo = options.logo;
  if (logo?.enabled && logo.dataUrl && isSafeImageDataUrl(logo.dataUrl)) {
    const ratio = clampLogoRatio(logo.sizeRatio);
    const box = qrSize * ratio;
    const cx = qrOffset + (qrSize - box) / 2;
    const cy = qrOffset + (qrSize - box) / 2;
    const pad = Math.max(0, Number(logo.padding) || 0);
    const lr = Math.max(0, Number(logo.radius) || 0);
    const clipId = "logoClip";
    parts.push(`<defs><clipPath id="${clipId}"><rect x="${cx}" y="${cy}" width="${box}" height="${box}" rx="${lr}" ry="${lr}"/></clipPath></defs>`);
    parts.push(`<rect x="${cx}" y="${cy}" width="${box}" height="${box}" rx="${lr}" ry="${lr}" fill="${escapeSvgColor(logo.background || "#ffffff")}"/>`);
    // SVG 中 cover/contain 用 preserveAspectRatio 近似
    const par = logo.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet";
    const ix = cx + pad;
    const iy = cy + pad;
    const iw = Math.max(1, box - pad * 2);
    const ih = Math.max(1, box - pad * 2);
    parts.push(
      `<image href="${escapeSvgAttr(logo.dataUrl)}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="${par}" clip-path="url(#${clipId})"/>`
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

/**
 * 仅允许 raster data URL，阻止 SVG-in-SVG 脚本
 * @param {string} url
 */
export function isSafeImageDataUrl(url) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(url || ""));
}

/**
 * @param {string} color
 */
function escapeSvgColor(color) {
  const c = String(color || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return c;
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(c)) return c;
  return "#000000";
}

/**
 * @param {string} value
 */
function escapeSvgAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 生成 data URL
 * @param {boolean[][]} modules
 * @param {{ cellSize?: number, foreground?: string, background?: string, margin?: number, format?: string }} [options]
 * @returns {string}
 */
export function renderToDataURL(modules, options = {}) {
  const format = options.format || "image/png";
  const canvas = document.createElement("canvas");
  renderToCanvas(canvas, modules, options);
  return canvas.toDataURL(format);
}

/**
 * 生成指定尺寸的 PNG data URL（基础 quiet zone）
 * @param {boolean[][]} modules
 * @param {number} pixelSize
 * @param {{ foreground?: string, background?: string, margin?: number }} [options]
 * @returns {string}
 */
export function renderAtSize(modules, pixelSize, options = {}) {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const size = modules.length;
  const cellSize = pixelSize / (size + margin * 2);
  return renderToDataURL(modules, {
    ...options,
    cellSize,
    margin,
  });
}

/**
 * 设计版 PNG data URL
 * @param {boolean[][]} modules
 * @param {RenderDesignOptions} options
 * @returns {Promise<string>}
 */
export async function renderDesignedDataURL(modules, options = {}) {
  const canvas = document.createElement("canvas");
  await renderDesignedCanvas(canvas, modules, options);
  return canvas.toDataURL("image/png");
}

/**
 * @param {string} dataURL
 * @param {string} filename
 */
export function downloadDataUrl(dataURL, filename) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * @param {string} svgString
 * @param {string} filename
 */
export function downloadSVG(svgString, filename) {
  // 拒绝嵌入脚本
  if (/<script[\s>]/i.test(svgString) || /\bon\w+\s*=/i.test(svgString)) {
    throw new Error("SVG 内容不安全，已阻止下载");
  }
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * @param {string} type
 * @param {number} size
 */
export function buildExportFilename(type, size, ext) {
  const safeType = String(type || "text").replace(/[^\w-]+/g, "").slice(0, 20) || "text";
  return `qrcode-${safeType}-${size}px.${ext}`;
}
