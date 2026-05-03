export async function readImageMeta(file) {
  const url = URL.createObjectURL(file);
  try {
    const bitmap = await createBitmap(file, url);
    const width = bitmap.width;
    const height = bitmap.height;
    if (typeof bitmap.close === "function") bitmap.close();
    return { width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createBitmap(file, url) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片读取失败"));
    img.src = url;
  });
}
