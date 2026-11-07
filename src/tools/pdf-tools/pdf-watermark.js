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
  /** @type {Record<string, { x: number, y: number }>} */
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
 * 用浏览器画布把水印文字画成透明背景的 PNG（支持中文和 emoji）
 * @param {string} text
 * @param {number} fontSize - PDF 里的字号（单位：pt）
 * @param {string} color - #RRGGBB
 * @returns {Promise<{ png: ArrayBuffer, width: number, height: number }>} width/height 为 PDF 中的尺寸
 */
async function renderTextToPng(text, fontSize, color) {
  const scale = 3;
  const font = `600 ${fontSize * scale}px -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持画布，无法生成水印");
  ctx.font = font;
  const textW = Math.ceil(ctx.measureText(text).width) || fontSize * scale;
  const textH = Math.ceil(fontSize * scale * 1.3);
  canvas.width = textW;
  canvas.height = textH;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, textH / 2);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("水印图片生成失败"))), "image/png");
  });
  return { png: await blob.arrayBuffer(), width: textW / scale, height: textH / scale };
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
  const { PDFDocument, degrees } = PDFLib;

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

  // PDF 标准字体不含中文，所以先把文字画成图片再贴到每一页
  const stamp = await renderTextToPng(text, fontSize, color);
  const image = await doc.embedPng(stamp.png);
  const w = stamp.width;
  const h = stamp.height;
  const rad = (rotation * Math.PI) / 180;

  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    const pos = calcPosition(width, height, w, h, position);
    // pdf-lib 绕左下角旋转；这里换算成绕水印中心旋转，位置才不会偏
    const cx = pos.x + w / 2;
    const cy = pos.y + h / 2;
    page.drawImage(image, {
      x: cx - ((w / 2) * Math.cos(rad) - (h / 2) * Math.sin(rad)),
      y: cy - ((w / 2) * Math.sin(rad) + (h / 2) * Math.cos(rad)),
      width: w,
      height: h,
      opacity,
      rotate: degrees(rotation),
    });

    if (onProgress) onProgress((i + 1) / total);
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
