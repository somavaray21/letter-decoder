import { MAX_TOTAL_BASE64_LENGTH } from "./schema";
import type { LetterImage } from "./types";

const MAX_WIDTH = 1500;
const JPEG_QUALITY = 0.85;

export type DocumentKind = "image" | "pdf";

export class PdfTooLargeError extends Error {}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

// Turns one uploaded file into what /api/decode needs: a photo is shrunk to JPEG, a PDF is sent as it is.
// Throws PdfTooLargeError for a PDF over the request limit, and an Error for a photo the browser can't open.
export async function prepareDocument(file: File): Promise<{ kind: DocumentKind; payload: LetterImage }> {
  if (!isPdf(file)) return { kind: "image", payload: await resizeImage(file) };
  const data = await toBase64(file);
  if (data.length > MAX_TOTAL_BASE64_LENGTH) throw new PdfTooLargeError("PDF too large");
  return { kind: "pdf", payload: { data, mimeType: "application/pdf" } };
}

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

function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });
}
