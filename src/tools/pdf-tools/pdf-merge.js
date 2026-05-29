/**
 * PDF 合并工具
 */
import { loadPdfLib } from "./pdf-lib-loader.js";

/**
 * 合并多个 PDF 文件
 * @param {File[]} files - PDF 文件列表（按顺序）
 * @param {(progress: number) => void} [onProgress] - 进度回调 0-1
 * @returns {Promise<Blob>}
 */
export async function mergePDFs(files, onProgress) {
  const PDFLib = await loadPdfLib();
  const { PDFDocument } = PDFLib;

  const merged = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const bytes = await files[i].arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
    if (onProgress) onProgress((i + 1) / total);
  }

  const pdfBytes = await merged.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * 获取 PDF 页数
 * @param {File} file
 * @returns {Promise<number>}
 */
export async function getPDFPageCount(file) {
  const PDFLib = await loadPdfLib();
  const bytes = await file.arrayBuffer();
  const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}
