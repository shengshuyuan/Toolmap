/**
 * PDF 加水印工具
 */
import { loadPdfLib } from "./pdf-lib-loader.js";

/**
 * 计算水印位置
 * @param {number} pageW
 * @param {number} pageH
 * @param {number} textW - 水印文字宽度（估算）
 * @param {number} textH - 水印文字高度（估算）
 * @param {string} position - tl/tc/tr/ml/mc/mr/bl/bc/br
 * @param {number} padding - 边距
 * @returns {{ x: number, y: number }}
 */
export function calcPosition(pageW, pageH, textW, textH, position, padding = 40) {
  const positions = {
    tl: { x: padding, y: pageH - textH - padding },
    tc: { x: (pageW - textW) / 2, y: pageH - textH - padding },
    tr: { x: pageW - textW - padding, y: pageH - textH - padding },
    ml: { x: padding, y: (pageH - textH) / 2 },
    mc: { x: (pageW - textW) / 2, y: (pageH - textH) / 2 },
    mr: { x: pageW - textW - padding, y: (pageH - textH) / 2 },
    bl: { x: padding, y: padding },
    bc: { x: (pageW - textW) / 2, y: padding },
    br: { x: pageW - textW - padding, y: padding },
  };
  return positions[position] || positions.mc;
}

/**
 * 给 PDF 添加水印
 * @param {File} file - 源 PDF
 * @param {{
 *   text: string,
 *   fontSize?: number,
 *   color?: string,
 *   opacity?: number,
 *   position?: string,
 *   rotation?: number,
 * }} options
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function addWatermark(file, options, onProgress) {
  const PDFLib = await loadPdfLib();
  const { PDFDocument, rgb, degrees } = PDFLib;

  const {
    text,
    fontSize = 48,
    color = "#999999",
    opacity = 0.3,
    position = "mc",
    rotation = -45,
  } = options;

  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();

  // 解析颜色 hex → rgb
  const r = parseInt(color.slice(1, 3), 16) / 255;
  const g = parseInt(color.slice(3, 5), 16) / 255;
  const b = parseInt(color.slice(5, 7), 16) / 255;

  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // 估算文字宽度（每个字符约 0.6 * fontSize）
    const textWidth = text.length * fontSize * 0.6;
    const textHeight = fontSize;

    const pos = calcPosition(width, height, textWidth, textHeight, position);

    page.drawText(text, {
      x: pos.x,
      y: pos.y,
      size: fontSize,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(rotation),
    });

    if (onProgress) onProgress((i + 1) / total);
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
