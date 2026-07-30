/**
 * QR Code 图片解码器 — 按需加载 jsQR
 */

let jsQRLibrary = null;
let loadPromise = null;

/**
 * 按需加载 jsQR 库
 * @returns {Promise<Function>}
 */
async function loadJsQR() {
  if (jsQRLibrary) return jsQRLibrary;
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "./vendor/jsqr.min.js";
    script.onload = () => {
      jsQRLibrary = window.jsQR || null;
      if (jsQRLibrary) {
        resolve(jsQRLibrary);
      } else {
        loadPromise = null; // 允许重试
        reject(new Error("jsQR 加载失败"));
      }
    };
    script.onerror = () => {
      loadPromise = null; // 允许重试
      reject(new Error("jsQR 加载失败，请检查网络连接"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * 从 ImageData 解码
 * @param {ImageData} imageData
 * @returns {Promise<{ data: string } | null>}
 */
export async function decodeFromImageData(imageData) {
  if (!imageData || !imageData.data) return null;
  const jsQR = await loadJsQR();
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  return result ? { data: result.data } : null;
}

/**
 * 从 Canvas 解码
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ data: string } | null>}
 */
export async function decodeFromCanvas(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return decodeFromImageData(imageData);
}

/**
 * 从图片文件解码二维码
 * @param {File} file - 图片文件
 * @returns {Promise<{ data: string } | null>}
 */
export async function decodeFromImage(file) {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return decodeFromCanvas(canvas);
}

/**
 * 加载图片为 Image 元素
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    img.src = url;
  });
}
