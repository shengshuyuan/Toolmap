import { closeImageSource, createBitmap } from "./utils.js";

export async function readImageMeta(file) {
  const bitmap = await createBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  closeImageSource(bitmap);
  return { width, height };
}
