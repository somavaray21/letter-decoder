import { MAX_TOTAL_BASE64_LENGTH } from "./schema";
import type { LetterImage } from "./types";

const MAX_WIDTH = 1500;
const MIN_WIDTH = 900;
const JPEG_QUALITY = 0.85;

// Shrinks a photo to about 1500px wide and returns base64 JPEG (no data: prefix).
export async function resizeImage(file: Blob, maxWidth = MAX_WIDTH): Promise<LetterImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { data: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// A long letter can be too big to send in one request. JPEG size grows with the image's area,
// so shrink every page by the square root of how far over the limit the letter is, with some room to spare.
export async function fitLetter(files: Blob[], pages: LetterImage[]): Promise<LetterImage[]> {
  const total = pages.reduce((n, p) => n + p.data.length, 0);
  if (total <= MAX_TOTAL_BASE64_LENGTH) return pages;
  const width = Math.max(MIN_WIDTH, Math.floor(MAX_WIDTH * Math.sqrt((MAX_TOTAL_BASE64_LENGTH * 0.9) / total)));
  return Promise.all(files.map((file) => resizeImage(file, width)));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}
