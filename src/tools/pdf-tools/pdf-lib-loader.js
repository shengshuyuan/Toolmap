/**
 * pdf-lib 按需加载器
 */

let pdfLibModule = null;
let loadPromise = null;

/**
 * 加载 pdf-lib 库
 * @returns {Promise<typeof window.PDFLib>}
 */
export async function loadPdfLib() {
  if (pdfLibModule) return pdfLibModule;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./vendor/pdf-lib.min.js";
    script.onload = () => {
      pdfLibModule = window.PDFLib || null;
      if (pdfLibModule) {
        resolve(pdfLibModule);
      } else {
        loadPromise = null; // 允许重试
        reject(new Error("pdf-lib 加载失败"));
      }
    };
    script.onerror = () => {
      loadPromise = null; // 允许重试
      reject(new Error("pdf-lib 加载失败，请检查网络连接"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
