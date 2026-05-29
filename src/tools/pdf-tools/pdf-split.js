/**
 * PDF 拆分工具
 */
import { loadPdfLib } from "./pdf-lib-loader.js";

/**
 * 解析页码范围字符串
 * @param {string} str - 例如 "1-3, 5, 7-9"
 * @param {number} maxPage - 最大页码
 * @returns {number[]} - 0-indexed 页码数组
 */
export function parsePageRanges(str, maxPage) {
  const pages = new Set();
  const parts = str.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      let start = parseInt(range[1], 10);
      let end = parseInt(range[2], 10);
      if (start > end) [start, end] = [end, start];
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= maxPage) pages.add(i - 1); // 转为 0-indexed
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPage) {
        pages.add(num - 1);
      }
    }
  }

  return [...pages].sort((a, b) => a - b);
}

/**
 * 拆分 PDF 文件
 * @param {File} file - 源 PDF 文件
 * @param {string} pageRanges - 页码范围字符串
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function splitPDF(file, pageRanges, onProgress) {
  const PDFLib = await loadPdfLib();
  const { PDFDocument } = PDFLib;

  const bytes = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(bytes);
  const maxPage = srcDoc.getPageCount();
  const pages = parsePageRanges(pageRanges, maxPage);

  if (pages.length === 0) throw new Error("未指定有效页码");
  if (pages.length === maxPage) throw new Error("拆分范围包含所有页面，请直接下载原文件");

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pages);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  if (onProgress) onProgress(1);

  const pdfBytes = await newDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * 按每页拆分 PDF
 * @param {File} file
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<Blob[]>}
 */
export async function splitPDFEveryPage(file, onProgress) {
  const PDFLib = await loadPdfLib();
  const { PDFDocument } = PDFLib;

  const bytes = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(bytes);
  const total = srcDoc.getPageCount();
  const results = [];

  for (let i = 0; i < total; i++) {
    const newDoc = await PDFDocument.create();
    const [page] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(page);
    const pdfBytes = await newDoc.save();
    results.push(new Blob([pdfBytes], { type: "application/pdf" }));
    if (onProgress) onProgress((i + 1) / total);
  }

  return results;
}
