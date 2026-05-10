// Watermark + official QR-code stamping for uploaded certificate files (image or PDF).
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export type StampMeta = {
  code: string;
  recipientName: string;
  skillName: string;
  verifyUrl: string;
};

// Brand colors (match the app's Success Green / Deep Navy theme)
const BRAND = { r: 0.13, g: 0.55, b: 0.33 };       // success green
const BRAND_DARK = { r: 0.06, g: 0.13, b: 0.25 };  // deep navy
const BRAND_HEX = "#22894f";
const BRAND_DARK_HEX = "#0f2240";

async function qrPngBytes(text: string, size = 512): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: size,
    color: { dark: BRAND_DARK_HEX, light: "#ffffff" },
  });
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ---------- PDF stamping ----------
export async function stampPdf(file: File, meta: StampMeta): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf);
  const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontR = await pdf.embedFont(StandardFonts.Helvetica);
  const qrBytes = await qrPngBytes(meta.verifyUrl, 512);
  const qrImg = await pdf.embedPng(qrBytes);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const minD = Math.min(width, height);

    // --- Top-right "Verified" corner badge ---
    const bw = minD * 0.34;
    const bh = minD * 0.07;
    const bx = width - bw - minD * 0.03;
    const by = height - bh - minD * 0.03;
    page.drawRectangle({
      x: bx, y: by, width: bw, height: bh,
      color: rgb(BRAND.r, BRAND.g, BRAND.b),
      opacity: 0.95,
    });
    // little check circle
    const cr = bh * 0.32;
    page.drawCircle({
      x: bx + bh * 0.55, y: by + bh / 2, size: cr,
      color: rgb(1, 1, 1), opacity: 0.95,
    });
    page.drawText("✓", {
      x: bx + bh * 0.55 - cr * 0.55, y: by + bh / 2 - cr * 0.55,
      size: cr * 1.4, font: fontB,
      color: rgb(BRAND.r, BRAND.g, BRAND.b),
    });
    page.drawText("VERIFIED BY CERTIFY", {
      x: bx + bh * 1.15, y: by + bh * 0.32,
      size: bh * 0.36, font: fontB, color: rgb(1, 1, 1),
    });

    // --- Bottom-right official QR card ---
    const qrSize = minD * 0.16;
    const pad = qrSize * 0.14;
    const cardW = qrSize + pad * 2;
    const headerH = qrSize * 0.22;
    const footerH = qrSize * 0.34;
    const cardH = qrSize + pad * 2 + headerH + footerH;
    const cx = width - cardW - minD * 0.03;
    const cy = minD * 0.03;

    // card background
    page.drawRectangle({
      x: cx, y: cy, width: cardW, height: cardH,
      color: rgb(1, 1, 1), opacity: 0.97,
      borderColor: rgb(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b),
      borderWidth: 1,
    });
    // header bar
    page.drawRectangle({
      x: cx, y: cy + cardH - headerH,
      width: cardW, height: headerH,
      color: rgb(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b),
    });
    const hTxt = "VERIFIED CREDENTIAL";
    const hSize = headerH * 0.42;
    const hWidth = fontB.widthOfTextAtSize(hTxt, hSize);
    page.drawText(hTxt, {
      x: cx + (cardW - hWidth) / 2,
      y: cy + cardH - headerH + (headerH - hSize) / 2 + hSize * 0.1,
      size: hSize, font: fontB, color: rgb(1, 1, 1),
    });
    // QR
    page.drawImage(qrImg, {
      x: cx + pad, y: cy + footerH,
      width: qrSize, height: qrSize,
    });
    // footer: code + scan label
    const codeSize = footerH * 0.28;
    const codeWidth = fontB.widthOfTextAtSize(meta.code, codeSize);
    page.drawText(meta.code, {
      x: cx + (cardW - codeWidth) / 2,
      y: cy + footerH * 0.55,
      size: codeSize, font: fontB,
      color: rgb(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b),
    });
    const sTxt = "Scan to verify · certify";
    const sSize = footerH * 0.2;
    const sWidth = fontR.widthOfTextAtSize(sTxt, sSize);
    page.drawText(sTxt, {
      x: cx + (cardW - sWidth) / 2,
      y: cy + footerH * 0.2,
      size: sSize, font: fontR,
      color: rgb(0.4, 0.4, 0.45),
    });
  }

  const out = await pdf.save();
  const ab = new ArrayBuffer(out.byteLength);
  new Uint8Array(ab).set(out);
  return new Blob([ab], { type: "application/pdf" });
}

// ---------- Image stamping ----------
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
    await drawStampOnCanvas(ctx, canvas.width, canvas.height, meta);
    return await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/png", 0.95)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function drawStampOnCanvas(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  meta: StampMeta,
) {
  const minD = Math.min(W, H);

  // --- Top-right verified badge ---
  const bw = minD * 0.36;
  const bh = minD * 0.07;
  const bx = W - bw - minD * 0.03;
  const by = minD * 0.03;
  ctx.save();
  ctx.fillStyle = BRAND_HEX;
  roundRect(ctx, bx, by, bw, bh, bh * 0.18);
  ctx.fill();
  // check circle
  const cr = bh * 0.32;
  ctx.beginPath();
  ctx.arc(bx + bh * 0.55, by + bh / 2, cr, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = BRAND_HEX;
  ctx.font = `bold ${cr * 1.5}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("✓", bx + bh * 0.55, by + bh / 2 + cr * 0.05);
  // label
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${bh * 0.4}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("VERIFIED BY CERTIFY", bx + bh * 1.1, by + bh / 2);
  ctx.restore();

  // --- Bottom-right official QR card ---
  const qrSize = minD * 0.18;
  const pad = qrSize * 0.12;
  const cardW = qrSize + pad * 2;
  const headerH = qrSize * 0.22;
  const footerH = qrSize * 0.34;
  const cardH = qrSize + pad * 2 + headerH + footerH;
  const cx = W - cardW - minD * 0.03;
  const cy = H - cardH - minD * 0.03;

  ctx.save();
  // card
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  roundRect(ctx, cx, cy, cardW, cardH, 8);
  ctx.fill();
  ctx.strokeStyle = BRAND_DARK_HEX;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // header bar
  ctx.fillStyle = BRAND_DARK_HEX;
  roundRect(ctx, cx, cy, cardW, headerH, 8, { tl: true, tr: true });
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${headerH * 0.5}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("VERIFIED CREDENTIAL", cx + cardW / 2, cy + headerH / 2);

  // QR
  const qrDataUrl = await QRCode.toDataURL(meta.verifyUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 512,
    color: { dark: BRAND_DARK_HEX, light: "#ffffff" },
  });
  const qr = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = qrDataUrl;
  });
  ctx.drawImage(qr, cx + pad, cy + headerH + pad, qrSize, qrSize);

  // footer: code + scan label
  const fy = cy + headerH + pad + qrSize;
  ctx.fillStyle = BRAND_DARK_HEX;
  ctx.font = `bold ${footerH * 0.32}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(meta.code, cx + cardW / 2, fy + footerH * 0.42);
  ctx.fillStyle = "#6b7280";
  ctx.font = `${footerH * 0.22}px sans-serif`;
  ctx.fillText("Scan to verify · certify", cx + cardW / 2, fy + footerH * 0.78);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  corners: { tl?: boolean; tr?: boolean; br?: boolean; bl?: boolean } = { tl: true, tr: true, br: true, bl: true },
) {
  const tl = corners.tl ? r : 0;
  const tr = corners.tr ? r : 0;
  const br = corners.br ? r : 0;
  const bl = corners.bl ? r : 0;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

export async function stampFile(
  file: File,
  meta: StampMeta,
): Promise<{ blob: Blob; ext: string; type: "pdf" | "image" }> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const blob = await stampPdf(file, meta);
    return { blob, ext: "pdf", type: "pdf" };
  }
  const blob = await stampImage(file, meta);
  return { blob, ext: "png", type: "image" };
}
