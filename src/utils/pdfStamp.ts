// src/utils/pdfStamp.ts
//
// Client-side PDF stamping utility. Burns a rotated official-style stamp
// directly into the PDF bytes, positioned in the horizontal middle of the
// page, on the same vertical band as the signatory block.
//
// Stamp contents: "REGISTRAR HIGH COURT" / "APPROVED" / a time stamp line /
// a signature mark (either a real signature image you supply, or a generated
// signature-style squiggle as a fallback).
//
// Requires: npm install pdf-lib

import { PDFDocument, rgb, degrees, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

export interface StampOptions {
  /** Name of the person approving (kept for API compatibility / future use, not printed by default) */
  approverName?: string;
  approverTitle?: string;
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
   * bottom (0 = bottom edge, 1 = top edge). Defaults to 0.16, which sits
   * roughly where a signature block usually lives on a single-page memo.
   * If you know the exact signature position (e.g. from a text-extraction
   * pass), pass centerYPoints instead for a pixel-accurate placement.
   */
  verticalAnchorFraction?: number;
  /** Absolute Y position in PDF points (bottom-left origin), overrides verticalAnchorFraction */
  centerYPoints?: number;
  /** Rotation in degrees. Negative tilts the left side up (classic stamp look). Defaults to -16 */
  angle?: number;
  /** Stamp ink color. Defaults to official stamp blue. */
  color?: { r: number; g: number; b: number };
  /** Which page to stamp (0-indexed). Defaults to the last page. */
  pageIndex?: number;
}

function rotatePoint(px: number, py: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: px * Math.cos(rad) - py * Math.sin(rad),
    y: px * Math.sin(rad) + py * Math.cos(rad),
  };
}

/**
 * Draws one rectangle, correctly rotated in place around a shared center
 * point. pdf-lib rotates primitives around their own (x, y) anchor, so to
 * make several primitives look like one rigid rotated group, we rotate each
 * primitive's local (unrotated) offset from the group center by the same
 * angle, then translate by the true center.
 */
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

  // Manual letter-spacing: walk the rotated baseline character by character.
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

/** A generated signature-style flourish, drawn as a rotated SVG path, used when no real signature image is supplied. */
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
    image = await pdfDoc.embedJpg(imageBytes);
  }
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  // localOffset is the desired center of the image within the stamp's local
  // (unrotated) frame; convert to the image's bottom-left anchor before rotating.
  const anchor = rotatePoint(localOffsetX - drawWidth / 2, localOffsetY - drawHeight / 2, angle);
  page.drawImage(image, {
    x: centerX + anchor.x,
    y: centerY + anchor.y,
    width: drawWidth,
    height: drawHeight,
    rotate: degrees(angle),
  });
}

/**
 * Stamps a PDF and returns the new file bytes. Does not mutate the input.
 */
export async function stampPdf(fileBytes: ArrayBuffer | Uint8Array, opts: StampOptions): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const pages = pdfDoc.getPages();
  const pageIndex = opts.pageIndex ?? pages.length - 1;
  const page = pages[pageIndex];
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const label = opts.label ?? 'APPROVED';
  const issuer = opts.issuer ?? 'REGISTRAR HIGH COURT';

  // Date only — no time component.
  const dateStr = (opts.date ?? new Date()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const angle = opts.angle ?? -16;
  // Official stamp blue
  const c = opts.color ?? { r: 0.09, g: 0.24, b: 0.6 };
  const color = rgb(c.r, c.g, c.b);

  const centerX = width / 2;
  const centerY = opts.centerYPoints ?? height * (opts.verticalAnchorFraction ?? 0.16);

  // Slightly shorter box now that we've dropped a line — keeps the stamp
  // feeling tight instead of leaving a gap where the timestamp used to sit.
  const boxWidth = 230;
  const boxHeight = 102;

  // Outer + inner border for a classic rubber-stamp look
  drawRotatedRect(page, centerX, centerY, -boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, angle, color, 3);
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

  // Line 1: issuer, small caps with letter-spacing
  drawRotatedCenteredText(page, font, issuer, centerX, centerY, boxHeight / 2 - 20, 9.5, angle, color, 1);

  // Line 2: APPROVED, large
  drawRotatedCenteredText(page, font, label, centerX, centerY, boxHeight / 2 - 46, 22, angle, color);

  // Line 3: date only
  drawRotatedCenteredText(page, font, dateStr, centerX, centerY, boxHeight / 2 - 64, 9, angle, color);

  // Signature, near the bottom of the box
  const sigLocalOffsetY = -boxHeight / 2 + 18;
  if (opts.signatureImageBytes) {
    await drawSignatureImage(
      pdfDoc,
      page,
      opts.signatureImageBytes,
      centerX,
      centerY,
      0,
      sigLocalOffsetY,
      boxWidth - 40,
      24,
      angle
    );
  } else {
    drawGeneratedSignature(page, centerX, centerY, -37, sigLocalOffsetY, angle, color);
  }

  return pdfDoc.save();
}

/**
 * Convenience wrapper: fetches a PDF from a URL, stamps it, and returns a
 * Blob ready to preview (URL.createObjectURL) or upload (FormData).
 */
export async function stampPdfFromUrl(fileUrl: string, opts: StampOptions): Promise<Blob> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch document for stamping (${res.status})`);
  }
  const bytes = await res.arrayBuffer();
  const stamped = await stampPdf(bytes, opts);

  // `stamped` is a Uint8Array<ArrayBufferLike>, which TS's BlobPart type
  // doesn't accept directly (ArrayBufferLike also covers SharedArrayBuffer).
  // Copy into a plain, concrete ArrayBuffer before constructing the Blob.
  const arrayBuffer = stamped.buffer.slice(
    stamped.byteOffset,
    stamped.byteOffset + stamped.byteLength
  ) as ArrayBuffer;

  return new Blob([arrayBuffer], { type: 'application/pdf' });
}