/**
 * QR Code 渲染器 — Canvas 和 SVG 输出
 */

/**
 * 在 Canvas 上绘制 QR Code
 * @param {HTMLCanvasElement} canvas
 * @param {boolean[][]} modules - encodeQR 返回的模块矩阵
 * @param {{ cellSize?: number, foreground?: string, background?: string, margin?: number }} [options]
 */
export function renderToCanvas(canvas, modules, options = {}) {
  const cellSize = options.cellSize || 4;
  const fg = options.foreground || "#000000";
  const bg = options.background || "#ffffff";
  const margin = options.margin ?? 4; // QR quiet zone 标准为 4 模块
  const size = modules.length;
  const totalSize = (size + margin * 2) * cellSize;

  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext("2d");

  // 背景
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, totalSize, totalSize);

  // 模块
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
 * 生成 SVG 字符串
 * @param {boolean[][]} modules
 * @param {{ foreground?: string, background?: string, margin?: number }} [options]
 * @returns {string}
 */
export function renderToSVG(modules, options = {}) {
  const fg = options.foreground || "#000000";
  const bg = options.background || "#ffffff";
  const margin = options.margin ?? 4;
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">` +
    `<rect width="${totalSize}" height="${totalSize}" fill="${bg}"/>` +
    `<path d="${paths}" fill="${fg}"/>` +
    `</svg>`;
}

/**
 * 生成 data URL
 * @param {boolean[][]} modules
 * @param {{ cellSize?: number, foreground?: string, background?: string, margin?: number, format?: string }} [options]
 * @returns {string}
 */
export function renderToDataURL(modules, options = {}) {
  const format = options.format || "image/png";
  // 用 OffscreenCanvas 或临时 canvas
  const canvas = document.createElement("canvas");
  renderToCanvas(canvas, modules, options);
  return canvas.toDataURL(format);
}

/**
 * 生成指定尺寸的 PNG data URL
 * @param {boolean[][]} modules
 * @param {number} pixelSize - 输出图片的宽高（像素）
 * @param {{ foreground?: string, background?: string }} [options]
 * @returns {string}
 */
export function renderAtSize(modules, pixelSize, options = {}) {
  const margin = 4;
  const size = modules.length;
  const cellSize = pixelSize / (size + margin * 2);
  return renderToDataURL(modules, {
    ...options,
    cellSize,
    margin,
  });
}

/**
 * 触发下载
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
 * 下载 SVG 文件
 * @param {string} svgString
 * @param {string} filename
 */
export function downloadSVG(svgString, filename) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}
