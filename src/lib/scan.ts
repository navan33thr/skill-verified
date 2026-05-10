// Extract a certificate code from a QR code embedded in an uploaded image or PDF.
import jsQR from "jsqr";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

function imageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext("2d")!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function tryDecode(canvas: HTMLCanvasElement): string | null {
  const data = imageDataFromCanvas(canvas);
  const r = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
  return r?.data ?? null;
}

async function decodeImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return tryDecode(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodePdfFile(file: File): Promise<string | null> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    const code = tryDecode(canvas);
    if (code) return code;
  }
  return null;
}

// Returns the QR payload string (typically a verify URL), or null if none found.
export async function extractQrFromFile(file: File): Promise<string | null> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return decodePdfFile(file);
  }
  return decodeImageFile(file);
}

// Pulls a 12-char certificate code from a verify URL or raw payload.
export function codeFromQrPayload(payload: string): string | null {
  try {
    const u = new URL(payload);
    const c = u.searchParams.get("code");
    if (c && /^[A-Z0-9]{12}$/i.test(c)) return c.toUpperCase();
  } catch {
    // not a URL
  }
  const m = payload.match(/\b([A-Z0-9]{12})\b/i);
  return m ? m[1].toUpperCase() : null;
}
