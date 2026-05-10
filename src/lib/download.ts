// On-demand conversion of a stored verified certificate file to PDF or JPG.
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

export type StoredFileType = "pdf" | "image";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fetchBlob(url: string): Promise<Blob> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to fetch certificate file");
  return await r.blob();
}

async function imageBlobToPdf(imgBlob: Blob): Promise<Blob> {
  const ab = await imgBlob.arrayBuffer();
  const pdf = await PDFDocument.create();
  let img;
  if (imgBlob.type.includes("png")) img = await pdf.embedPng(ab);
  else img = await pdf.embedJpg(ab);
  const page = pdf.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  const out = await pdf.save();
  const buf = new ArrayBuffer(out.byteLength);
  new Uint8Array(buf).set(out);
  return new Blob([buf], { type: "application/pdf" });
}

async function pdfBlobToJpg(pdfBlob: Blob): Promise<Blob> {
  const ab = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  // White background so JPG doesn't render transparent areas as black
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  return await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
  );
}

async function imageBlobToJpg(imgBlob: Blob): Promise<Blob> {
  if (imgBlob.type === "image/jpeg") return imgBlob;
  const url = URL.createObjectURL(imgBlob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadVerifiedFile(
  fileUrl: string,
  storedType: StoredFileType,
  format: "pdf" | "jpg",
  baseName: string,
) {
  const src = await fetchBlob(fileUrl);
  let out: Blob;
  let ext: string;
  if (format === "pdf") {
    out = storedType === "pdf" ? src : await imageBlobToPdf(src);
    ext = "pdf";
  } else {
    out = storedType === "pdf" ? await pdfBlobToJpg(src) : await imageBlobToJpg(src);
    ext = "jpg";
  }
  triggerDownload(out, `${baseName}.${ext}`);
}
