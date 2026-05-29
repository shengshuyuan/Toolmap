import { getModeSettings, getOutputMime, buildOutputName, createBitmap } from "./utils.js";

export function calculateTargetSize(width, height, maxEdge) {
  const limit = Number(maxEdge) || 0;
  if (!limit || Math.max(width, height) <= limit) return { width, height, resized: false };

  const scale = limit / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

export async function compressImageFile(file, settings) {
  const bitmap = await createBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const outputMime = getOutputMime(file.type, settings.outputFormat, settings.mode);
  const mode = getModeSettings(settings.mode);
  const quality = settings.mode === "custom" ? settings.quality : mode.quality;
  const candidates = buildCompressionCandidates({
    mode: settings.mode,
    outputMime,
    maxEdge: settings.maxEdge,
    quality,
    width: originalWidth,
    height: originalHeight,
  });

  let best = null;
  try {
    for (const candidate of candidates) {
      const attempt = await encodeCandidate(bitmap, outputMime, candidate);
      if (!best || attempt.blob.size < best.blob.size) best = attempt;
      const savedRatio = file.size ? ((file.size - best.blob.size) / file.size) * 100 : 0;
      if (settings.mode !== "smart" || savedRatio >= 18) break;
    }
  } finally {
    if (typeof bitmap.close === "function") bitmap.close();
  }
  if (!best) throw new Error("图片压缩失败，请换一张图片试试。");

  const shouldKeepOriginal =
    !best.target.resized &&
    settings.outputFormat === "original" &&
    best.blob.size >= file.size;

  const blob = shouldKeepOriginal ? file : best.blob;
  const type = shouldKeepOriginal ? file.type : best.blob.type || outputMime;
  const fileName = shouldKeepOriginal ? file.name : buildOutputName(file.name, type);
  // 保留原图时不创建新 URL，index.js 已有 originalUrl
  const url = shouldKeepOriginal ? null : URL.createObjectURL(blob);

  return {
    blob,
    url,
    fileName,
    type,
    width: shouldKeepOriginal ? originalWidth : best.target.width,
    height: shouldKeepOriginal ? originalHeight : best.target.height,
    resized: shouldKeepOriginal ? false : best.target.resized,
    keptOriginal: shouldKeepOriginal,
    adaptive: Boolean(best.adaptive && !shouldKeepOriginal),
    originalSize: file.size,
    outputSize: blob.size,
    savedBytes: Math.max(0, file.size - blob.size),
    savedRatio: file.size ? Math.max(0, (file.size - blob.size) / file.size) * 100 : 0,
  };
}

export function buildCompressionCandidates({ mode, outputMime, maxEdge, quality, width, height }) {
  const baseEdge = Number(maxEdge) || 0;
  const candidates = [{ quality, maxEdge: baseEdge, adaptive: false }];
  if (mode !== "smart" || outputMime !== "image/webp") return candidates;

  const longest = Math.max(Number(width) || 0, Number(height) || 0);
  const adaptiveEdges = longest >= 1800 ? [Math.min(baseEdge || 1920, 1920), 1600] : [baseEdge || 0];
  for (const edge of adaptiveEdges) {
    candidates.push({ quality: Math.min(quality, 0.68), maxEdge: edge, adaptive: true });
  }
  return dedupeCandidates(candidates);
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.quality}:${candidate.maxEdge}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function encodeCandidate(bitmap, outputMime, candidate) {
  const target = calculateTargetSize(bitmap.width, bitmap.height, candidate.maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d", { alpha: outputMime !== "image/jpeg" });
  if (!ctx) throw new Error("当前浏览器不支持图片压缩画布。");
  if (outputMime === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, target.width, target.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, target.width, target.height);
  return {
    blob: await canvasToBlob(canvas, outputMime, candidate.quality),
    target,
    adaptive: candidate.adaptive,
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片压缩失败，请换一张图片试试。"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}
