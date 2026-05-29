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
 * 从图片文件解码二维码
 * @param {File} file - 图片文件
 * @returns {Promise<{ data: string } | null>}
 */
export async function decodeFromImage(file) {
  const jsQR = await loadJsQR();

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });

  return result ? { data: result.data } : null;
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
