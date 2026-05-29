import { createBitmap } from "./utils.js";

export async function readImageMeta(file) {
  const bitmap = await createBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  if (typeof bitmap.close === "function") bitmap.close();
  return { width, height };
}
