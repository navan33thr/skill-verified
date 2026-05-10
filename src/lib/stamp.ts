// Watermark + QR-code stamping for uploaded certificate files (image or PDF).
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import QRCode from "qrcode";

export type StampMeta = {
  code: string;
  recipientName: string;
  skillName: string;
  verifyUrl: string;
};

async function qrPngBytes(text: string, size = 320): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
  });
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export async function stampPdf(file: File, meta: StampMeta): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
  const qrBytes = await qrPngBytes(meta.verifyUrl, 320);
  const qrImg = await pdf.embedPng(qrBytes);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();

    // Diagonal "VERIFIED" watermark
    const text = "VERIFIED BY CERTIFY";
    const size = Math.min(width, height) * 0.08;
    page.drawText(text, {
      x: width * 0.1,
      y: height * 0.45,
      size,
      font,
      color: rgb(0.18, 0.7, 0.42),
      opacity: 0.18,
      rotate: degrees(30),
    });

    // QR code bottom-right
    const qrSize = Math.min(width, height) * 0.16;
    const pad = qrSize * 0.15;
    page.drawRectangle({
      x: width - qrSize - pad * 2,
      y: pad,
      width: qrSize + pad,
      height: qrSize + pad + 14,
      color: rgb(1, 1, 1),
      opacity: 0.9,
      borderColor: rgb(0.18, 0.7, 0.42),
      borderWidth: 1,
    });
    page.drawImage(qrImg, {
      x: width - qrSize - pad * 1.5,
      y: pad + 14,
      width: qrSize,
      height: qrSize,
    });
    page.drawText(meta.code, {
      x: width - qrSize - pad * 1.5,
      y: pad + 2,
      size: Math.max(7, qrSize * 0.08),
      font: fontReg,
      color: rgb(0.18, 0.7, 0.42),
    });
  }

  const out = await pdf.save();
  // Copy to a fresh ArrayBuffer to satisfy the Blob BlobPart typing
  const ab = new ArrayBuffer(out.byteLength);
  new Uint8Array(ab).set(out);
  return new Blob([ab], { type: "application/pdf" });
}

export async function stampImage(file: File, meta: StampMeta): Promise<Blob> {
  const url = URL.createObjectURL(file);
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
    ctx.drawImage(img, 0, 0);

    // Diagonal watermark
    const fs = Math.min(canvas.width, canvas.height) * 0.08;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((-30 * Math.PI) / 180);
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.fillStyle = "rgba(46, 178, 106, 0.22)";
    ctx.textAlign = "center";
    ctx.fillText("VERIFIED BY CERTIFY", 0, 0);
    ctx.restore();

    // QR bottom-right
    const qrDataUrl = await QRCode.toDataURL(meta.verifyUrl, { errorCorrectionLevel: "M", margin: 1, width: 320 });
    const qr = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = qrDataUrl;
    });
    const qrSize = Math.min(canvas.width, canvas.height) * 0.18;
    const pad = qrSize * 0.12;
    const x = canvas.width - qrSize - pad * 2;
    const y = canvas.height - qrSize - pad * 2 - 18;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(x - pad / 2, y - pad / 2, qrSize + pad, qrSize + pad + 22);
    ctx.strokeStyle = "rgba(46,178,106,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - pad / 2, y - pad / 2, qrSize + pad, qrSize + pad + 22);
    ctx.drawImage(qr, x, y, qrSize, qrSize);
    ctx.fillStyle = "rgb(46,140,86)";
    ctx.font = `bold ${Math.max(10, qrSize * 0.09)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(meta.code, x + qrSize / 2, y + qrSize + 14);

    return await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/png", 0.95)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function stampFile(file: File, meta: StampMeta): Promise<{ blob: Blob; ext: string; type: "pdf" | "image" }> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const blob = await stampPdf(file, meta);
    return { blob, ext: "pdf", type: "pdf" };
  }
  const blob = await stampImage(file, meta);
  return { blob, ext: "png", type: "image" };
}
