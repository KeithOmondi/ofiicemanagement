// src/utils/generateGRMemoPdf.ts
//
// Builds a printable PDF letter for GENERAL REQUEST (GR) memos —
// Driver/Bodyguard/Firearm/Station/Force Number/Residence Security/Sentry
// requests to the Kenya Police Service or Administration Police Service.
//
// Layout: standard letter format (crest+header side by side → Ref/Date →
// address → RE: subject → body → signature → Copy to. → footer).
// Styling: Arial 12pt for header, Tahoma 12pt for everything else,
// address block with 1.5 line spacing, and bold names in body.

import jsPDF from 'jspdf';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

export interface GRMemoCopyToEntry {
  label: string;
  value: string; // may contain '\n' for a continuation line (e.g. station), rendered un-numbered and indented
}

export interface GRMemoParams {
  to: string;              // full address block, newline-separated
  from: string;             // e.g. "REGISTRAR, HIGH COURT"
  ref: string;               // e.g. "RHC/10"
  date: string;              // e.g. "18th July 2026"
  subject: string;          // rendered after "RE: ", uppercased
  bodyText: string;         // may include **bold** markers for judge/officer names
  copyTo: GRMemoCopyToEntry[];
  signatoryName: string;
  crestUrl: string;
  signatureUrl?: string;
  fromDepartment?: string;  // defaults to `from` if omitted
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load image for PDF:', url, error);
    return null;
  }
}

function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

/**
 * Renders text with **bold** markers.
 * Splits by ** and toggles bold for the enclosed parts.
 */
function renderBoldText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  fontSize: number = 12,
): { x: number; y: number } {
  const parts = text.split(/\*\*/);
  let currentX = x;
  let currentY = y;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i % 2 === 1) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    const lines = doc.splitTextToSize(part, maxWidth - (currentX - x));
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      const lineWidth = doc.getTextWidth(line);
      if (currentX + lineWidth > x + maxWidth) {
        currentX = x;
        currentY += lineHeight;
      }
      doc.text(line, currentX, currentY);
      currentX += doc.getTextWidth(line) + 2;
    }
  }

  doc.setFont('helvetica', 'normal');

  return { x: currentX, y: currentY };
}

/**
 * Draws a right-aligned date string, rendering a trailing ordinal suffix
 * (st/nd/rd/th) as superscript — e.g. "18" + superscript "th" + " July 2026".
 * Falls back to plain right-aligned text if the string doesn't match the
 * `<digits><suffix><rest>` pattern.
 */
function drawDateWithOrdinal(
  doc: jsPDF,
  dateStr: string,
  rightX: number,
  y: number,
  fontSize: number = 12,
): void {
  const match = dateStr.match(/^(\d+)(st|nd|rd|th)(.*)$/i);
  doc.setFont('helvetica', 'bold');

  if (!match) {
    doc.setFontSize(fontSize);
    doc.text(dateStr, rightX, y, { align: 'right' });
    return;
  }

  const [, dayPart, suffix, rest] = match;
  const supFontSize = fontSize * 0.7;

  doc.setFontSize(fontSize);
  const dayWidth = doc.getTextWidth(dayPart);
  doc.setFontSize(supFontSize);
  const suffixWidth = doc.getTextWidth(suffix);
  doc.setFontSize(fontSize);
  const restWidth = doc.getTextWidth(rest);

  const totalWidth = dayWidth + suffixWidth + restWidth;
  let x = rightX - totalWidth;

  doc.setFontSize(fontSize);
  doc.text(dayPart, x, y);
  x += dayWidth;

  doc.setFontSize(supFontSize);
  doc.text(suffix, x, y - 3);
  x += suffixWidth;

  doc.setFontSize(fontSize);
  doc.text(rest, x, y);
}

export async function generateGRMemoPdf(params: GRMemoParams): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  let cursorY = 40;

  // ── Crest + Header (left-aligned, side by side) ─────────────────────────
  const crestDataUrl = await urlToDataUrl(params.crestUrl);
  const crestW = 70;
  const crestH = 35;
  const headerTextX = margin + crestW + 14;
  const headerBlockTop = cursorY;

  if (crestDataUrl) {
    doc.addImage(
      crestDataUrl,
      detectImageFormat(crestDataUrl),
      margin,
      headerBlockTop,
      crestW,
      crestH,
    );
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('THE JUDICIARY', headerTextX, headerBlockTop + 14);

  doc.setFontSize(11);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', headerTextX, headerBlockTop + 30);

  // Advance past whichever is taller — the crest or the text block
  cursorY = headerBlockTop + Math.max(crestH, 34) + 10;

  // Rule under the header block
  doc.setDrawColor(180, 150, 70);
  doc.setLineWidth(1);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  doc.setDrawColor(0, 0, 0);
  cursorY += 20;

  // ── Ref / Date line ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Ref: ${params.ref}`, margin, cursorY);
  drawDateWithOrdinal(doc, params.date, pageWidth - margin, cursorY);
  cursorY += 24;

  // ── Address block (TO) ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const lineHeightAddress = 18;
  const addressLines = params.to.split('\n').filter(line => line.trim() !== '');
  addressLines.forEach((line, idx) => {
    // First line ("The Deputy Inspector General,") is bold in the reference letter
    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
    wrapped.forEach((l: string) => {
      doc.text(l, margin, cursorY);
      cursorY += lineHeightAddress;
    });
  });
  doc.setFont('helvetica', 'normal');
  cursorY += 8;

  // ── RE: subject (bold, underlined) ──────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const subjectFull = 'RE: ' + params.subject.toUpperCase();
  const subjectLines = doc.splitTextToSize(subjectFull, pageWidth - margin * 2);
  subjectLines.forEach((line: string) => {
    doc.text(line, margin, cursorY);
    const lineWidth = doc.getTextWidth(line);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY + 2, margin + lineWidth, cursorY + 2);
    cursorY += 16;
  });
  cursorY += 8;

  // ── Body ──────────────────────────────────────────────────────────────────
  const lineHeightBody = 16;
  const paragraphs = params.bodyText.split(/\n\s*\n/);
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const result = renderBoldText(doc, trimmed, margin, cursorY, pageWidth - margin * 2, lineHeightBody, 12);
    cursorY = result.y + lineHeightBody;
  }
  cursorY += 10;

  // ── Signature block ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Yours sincerely,', margin, cursorY);
  cursorY += 30;

  doc.text(params.signatoryName || ' ', margin, cursorY);
  cursorY += 14;

  const signatureDataUrl = params.signatureUrl
    ? await urlToDataUrl(params.signatureUrl)
    : null;
  if (signatureDataUrl) {
    const sigW = 110;
    const sigH = 40;
    doc.addImage(
      signatureDataUrl,
      detectImageFormat(signatureDataUrl),
      margin,
      cursorY - 30,
      sigW,
      sigH,
    );
    cursorY += 14;
  }

  // From department — bold, NOT underlined (matches reference letter)
  const fromText = (params.fromDepartment || params.from).toUpperCase();
  doc.text(fromText, margin, cursorY);
  cursorY += 28;

  // ── Copy to. ────────────────────────────────────────────────────────────
  if (params.copyTo.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Copy to.', margin, cursorY);
    cursorY += 18;

    doc.setFont('helvetica', 'normal');
    for (const entry of params.copyTo) {
      const [firstLine, ...continuationLines] = entry.value.split('\n');

      const firstWrapped = doc.splitTextToSize(
        `${entry.label} ${firstLine}`,
        pageWidth - margin * 2 - 14,
      );
      firstWrapped.forEach((line: string) => {
        doc.text(line, margin, cursorY);
        cursorY += 16;
      });

      continuationLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2 - 14);
        wrapped.forEach((l: string) => {
          doc.text(l, margin + 14, cursorY);
          cursorY += 16;
        });
      });

      cursorY += 4;
    }
  }

  // ── Footer — emblem + address, anchored to page bottom ──────────────────
  const footerLogoW = 48;
  const footerLogoH = 36;
  const footerBlockH = 52;
  const footerY = pageHeight - footerBlockH - 8;

  doc.setLineWidth(0.5);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  const footerEmblemDataUrl = await urlToDataUrl(FOOTER_EMBLEM_SRC);
  if (footerEmblemDataUrl) {
    const logoTopY = footerY + (footerBlockH - footerLogoH) / 2;
    doc.addImage(
      footerEmblemDataUrl,
      detectImageFormat(footerEmblemDataUrl),
      margin,
      logoTopY,
      footerLogoW,
      footerLogoH,
    );
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
    pageWidth - margin,
    footerY + 14,
    { align: 'right' },
  );
  doc.text(
    'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
    pageWidth - margin,
    footerY + 28,
    { align: 'right' },
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 61, 28);
  doc.text('Justice Be Our Shield and Defender', pageWidth - margin, footerY + 38, {
    align: 'right',
  });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return doc.output('blob');
}