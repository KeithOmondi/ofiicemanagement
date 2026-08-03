// src/utils/pdfStamp.ts

import { PDFDocument, rgb, degrees, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

export interface StampOptions {
  /** Defaults to now */
  date?: Date;
  /** Big center line. Defaults to "APPROVED" */
  label?: string;
  /** Small line above the label. Defaults to "REGISTRAR HIGH COURT" */
  issuer?: string;
  /**
   * Optional real signature image (PNG or JPG bytes) to embed on the stamp.
   * If omitted, a generated signature-style squiggle is drawn instead.
   */
  signatureImageBytes?: ArrayBuffer | Uint8Array;
  /**
   * Vertical anchor for the stamp, as a fraction of page height from the
   * bottom (0 = bottom edge, 1 = top edge). Defaults to 0.16
   */
  verticalAnchorFraction?: number;
  /** Absolute Y position in PDF points (bottom-left origin), overrides verticalAnchorFraction */
  centerYPoints?: number;
  /** Rotation in degrees. Defaults to -16 */
  angle?: number;
  /** Stamp ink color. Defaults to official stamp blue. */
  color?: { r: number; g: number; b: number };
  /** Which page to stamp (0-indexed). Defaults to the last page. */
  pageIndex?: number;
  /** Name of the approver to display on the stamp */
  approverName?: string;
  /** Title of the approver to display on the stamp (currently not displayed in stamp but kept for future use) */
  approverTitle?: string;
}

function rotatePoint(px: number, py: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: px * Math.cos(rad) - py * Math.sin(rad),
    y: px * Math.sin(rad) + py * Math.cos(rad),
  };
}

function drawRotatedRect(
  page: PDFPage,
  centerX: number,
  centerY: number,
  localOffsetX: number,
  localOffsetY: number,
  width: number,
  height: number,
  angle: number,
  color: ReturnType<typeof rgb>,
  borderWidth: number
) {
  const anchor = rotatePoint(localOffsetX, localOffsetY, angle);
  page.drawRectangle({
    x: centerX + anchor.x,
    y: centerY + anchor.y,
    width,
    height,
    borderColor: color,
    borderWidth,
    rotate: degrees(angle),
  });
}

function drawRotatedCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  centerX: number,
  centerY: number,
  localOffsetY: number,
  size: number,
  angle: number,
  color: ReturnType<typeof rgb>,
  charSpacing = 0
) {
  const textWidth = font.widthOfTextAtSize(text, size) + charSpacing * (text.length - 1);
  const anchor = rotatePoint(-textWidth / 2, localOffsetY, angle);

  if (charSpacing === 0) {
    page.drawText(text, {
      x: centerX + anchor.x,
      y: centerY + anchor.y,
      size,
      font,
      color,
      rotate: degrees(angle),
    });
    return;
  }

  let cursor = 0;
  for (const ch of text) {
    const chWidth = font.widthOfTextAtSize(ch, size);
    const chAnchor = rotatePoint(-textWidth / 2 + cursor, localOffsetY, angle);
    page.drawText(ch, {
      x: centerX + chAnchor.x,
      y: centerY + chAnchor.y,
      size,
      font,
      color,
      rotate: degrees(angle),
    });
    cursor += chWidth + charSpacing;
  }
}

function drawGeneratedSignature(
  page: PDFPage,
  centerX: number,
  centerY: number,
  localOffsetX: number,
  localOffsetY: number,
  angle: number,
  color: ReturnType<typeof rgb>
) {
  const path =
    'M0,0 C6,-14 14,10 22,-6 C28,-16 34,4 40,-8 C46,-18 52,2 58,-9 C63,-16 68,-2 74,-6';
  const anchor = rotatePoint(localOffsetX, localOffsetY, angle);
  page.drawSvgPath(path, {
    x: centerX + anchor.x,
    y: centerY + anchor.y,
    borderColor: color,
    borderWidth: 1.4,
    scale: 1,
    rotate: degrees(angle),
  });
}

async function drawSignatureImage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  imageBytes: ArrayBuffer | Uint8Array,
  centerX: number,
  centerY: number,
  localOffsetX: number,
  localOffsetY: number,
  maxWidth: number,
  maxHeight: number,
  angle: number
) {
  let image;
  try {
    image = await pdfDoc.embedPng(imageBytes);
  } catch {
    try {
      image = await pdfDoc.embedJpg(imageBytes);
    } catch {
      console.error('Failed to embed signature image - invalid format');
      return;
    }
  }

  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  const anchor = rotatePoint(localOffsetX - drawWidth / 2, localOffsetY - drawHeight / 2, angle);
  page.drawImage(image, {
    x: centerX + anchor.x,
    y: centerY + anchor.y,
    width: drawWidth,
    height: drawHeight,
    rotate: degrees(angle),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  OPERATION 1: STAMPING (independent — draws the "APPROVED" box)
//  Used for documents that need the official court stamp.
// ═══════════════════════════════════════════════════════════════════════════

export async function stampPdf(fileBytes: ArrayBuffer | Uint8Array, opts: StampOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const pages = pdfDoc.getPages();
  const pageIndex = opts.pageIndex ?? pages.length - 1;
  const page = pages[pageIndex];
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const label = opts.label ?? 'APPROVED';
  const issuer = opts.issuer ?? 'REGISTRAR HIGH COURT';

  const dateStr = (opts.date ?? new Date()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const angle = opts.angle ?? -16;
  const c = opts.color ?? { r: 0.09, g: 0.24, b: 0.6 };
  const color = rgb(c.r, c.g, c.b);

  const centerX = width / 2;
  const centerY = opts.centerYPoints ?? height * (opts.verticalAnchorFraction ?? 0.16);

  // ─── STAMP BOX DIMENSIONS ──────────────────────────────────────────────────
  // Increased height to accommodate approver name
  const boxWidth = 220;
  const boxHeight = 140;

  // Outer border
  drawRotatedRect(page, centerX, centerY, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, angle, color, 3);
  // Inner border
  drawRotatedRect(
    page,
    centerX,
    centerY,
    -boxWidth / 2 + 6,
    -boxHeight / 2 + 6,
    boxWidth - 12,
    boxHeight - 12,
    angle,
    color,
    1
  );

  // ─── LINE 1: Issuer ──────────────────────────────────────────────────────
  drawRotatedCenteredText(page, font, issuer, centerX, centerY, boxHeight / 2 - 16, 9.5, angle, color, 1);

  // ─── LINE 2: APPROVED ────────────────────────────────────────────────────
  drawRotatedCenteredText(page, font, label, centerX, centerY, boxHeight / 2 - 40, 20, angle, color);

  // ─── LINE 3: Approver Name ─────────────────────────────────────────────
  const nameYOffset = boxHeight / 2 - 58;
  const approverName = opts.approverName?.toUpperCase() || 'REGISTRAR';
  drawRotatedCenteredText(page, font, approverName, centerX, centerY, nameYOffset, 9, angle, color);

  // ─── LINE 4: Date ────────────────────────────────────────────────────────
  const dateYOffset = boxHeight / 2 - 76;
  drawRotatedCenteredText(page, font, dateStr, centerX, centerY, dateYOffset, 9, angle, color);

  // ─── SIGNATURE IMAGE ───────────────────────────────────────────────────
  // Position signature in the bottom center of the stamp
  const sigLocalOffsetY = -boxHeight / 2 + 28;

  if (opts.signatureImageBytes) {
    await drawSignatureImage(
      pdfDoc,
      page,
      opts.signatureImageBytes,
      centerX,
      centerY,
      0,
      sigLocalOffsetY,
      boxWidth - 50,
      28,
      angle
    );
  } else {
    drawGeneratedSignature(page, centerX, centerY, -35, sigLocalOffsetY, angle, color);
  }

  return pdfDoc.save();
}

export async function stampPdfFromUrl(fileUrl: string, opts: StampOptions): Promise<Blob> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch document for stamping (${res.status})`);
  }
  const bytes = await res.arrayBuffer();
  const stamped = await stampPdf(bytes, opts);

  const arrayBuffer = stamped.buffer.slice(
    stamped.byteOffset,
    stamped.byteOffset + stamped.byteLength
  ) as ArrayBuffer;

  return new Blob([arrayBuffer], { type: 'application/pdf' });
}

// ═══════════════════════════════════════════════════════════════════════════
//  OPERATION 2: SIGNING (independent — draws a plain signature block,
//  no box, no "APPROVED", no date). Used for documents that need only a
//  signature. Does not call stampPdf and shares no logic with it beyond
//  the generic image-embedding step.
// ═══════════════════════════════════════════════════════════════════════════

export interface SignatureOptions {
  signatureImageBytes: ArrayBuffer | Uint8Array;
  signatoryName: string;
  signatoryTitle: string;
  /** Page to place the signature on. Defaults to appending a new blank page. */
  pageIndex?: number;
  /** Left offset in points. Defaults to 60. */
  x?: number;
  /** Top offset in points from the top edge. Defaults to 140. */
  yFromTop?: number;
}

export async function signPdf(
  fileBytes: ArrayBuffer | Uint8Array,
  opts: SignatureOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const existingPages = pdfDoc.getPages();

  let page: PDFPage;
  if (opts.pageIndex !== undefined) {
    page = existingPages[opts.pageIndex];
  } else {
    // Append a fresh page — matches the "signature on its own page" layout
    const last = existingPages[existingPages.length - 1];
    const { width, height } = last.getSize();
    page = pdfDoc.addPage([width, height]);
  }

  const { height } = page.getSize();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);

  const x = opts.x ?? 60;
  const topY = height - (opts.yFromTop ?? 140);

  // ─── Signature image ─────────────────────────────────────────────────
  let image;
  try {
    image = await pdfDoc.embedPng(opts.signatureImageBytes);
  } catch {
    image = await pdfDoc.embedJpg(opts.signatureImageBytes);
  }

  const maxWidth = 220;
  const maxHeight = 70;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  page.drawImage(image, {
    x,
    y: topY,
    width: drawWidth,
    height: drawHeight,
  });

  // ─── Name ────────────────────────────────────────────────────────────
  const nameSize = 13;
  const nameY = topY - 18;
  page.drawText(opts.signatoryName.toUpperCase(), {
    x, y: nameY, size: nameSize, font: boldFont, color: black,
  });

  // ─── Title (underlined) ──────────────────────────────────────────────
  const titleSize = 13;
  const titleY = nameY - 20;
  const titleText = opts.signatoryTitle.toUpperCase();
  page.drawText(titleText, {
    x, y: titleY, size: titleSize, font: boldFont, color: black,
  });
  const titleWidth = boldFont.widthOfTextAtSize(titleText, titleSize);
  page.drawLine({
    start: { x, y: titleY - 3 },
    end: { x: x + titleWidth, y: titleY - 3 },
    thickness: 1,
    color: black,
  });

  return pdfDoc.save();
}

export async function signPdfFromUrl(fileUrl: string, opts: SignatureOptions): Promise<Blob> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch document for signing (${res.status})`);
  }
  const bytes = await res.arrayBuffer();
  const signed = await signPdf(bytes, opts);

  const arrayBuffer = signed.buffer.slice(
    signed.byteOffset,
    signed.byteOffset + signed.byteLength
  ) as ArrayBuffer;

  return new Blob([arrayBuffer], { type: 'application/pdf' });
}