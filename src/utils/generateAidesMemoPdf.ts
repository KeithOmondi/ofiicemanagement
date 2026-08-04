// src/utils/generateAidesMemoPdf.ts
//
// Builds a printable PDF memo for AIDE (Officer Attachment) requests.
// AideMemoParams is now the single source of truth consumed by both the
// PDF and DOCX generators, and is built entirely from the editable
// preview state in AidesModal — nothing here re-derives text from the
// raw form fields, so whatever the user edited is exactly what prints.

import jsPDF from 'jspdf';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

export interface AideMemoParams {
  // Header fields
  ref: string;
  date: string;

  // Addressee
  to: string; // e.g. "The Deputy Inspector General"
  toOrganization: string; // e.g. "Kenya Police Service"
  toBuilding?: string; // e.g. "Vigilance House"
  toPOBox?: string; // e.g. "P.O. Box 53258-00200"
  toCity?: string; // e.g. "NAIROBI."

  subject: string;

  // Body
  bodyText: string;
  greetingText?: string;
  officerSuitabilityText?: string;
  closingText?: string;

  // Judge details
  judgeName: string;
  judgeTitle?: string;
  judgeLocation?: string;

  // Officer details
  officerName: string;
  officerRank: string;
  officerNumber: string;
  currentStation: string;
  assignmentType: string;

  // Signatory fields
  signatoryName?: string;
  signatoryTitle?: string;
  fromDepartment?: string;

  // Copies (CC)
  ccList?: string[];

  // Images
  crestUrl: string;
}

// ─── Shared helpers ──────────────────────────────────────────────────────

export function getRankAbbreviation(rank: string): string {
  const match = rank.match(/\(([^)]+)\)/);
  return match ? match[1] : rank;
}

export function buildToAddressLines(params: Pick<AideMemoParams, 'toOrganization' | 'toBuilding' | 'toPOBox'>): string[] {
  const lines: string[] = [];
  if (params.toOrganization) lines.push(`${params.toOrganization},`);
  if (params.toBuilding) lines.push(`${params.toBuilding},`);
  if (params.toPOBox) lines.push(params.toPOBox);
  return lines;
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

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function getScaledImageSize(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
  fallbackSize: number,
): Promise<{ width: number; height: number }> {
  const dims = await getImageDimensions(dataUrl);
  if (!dims || dims.width <= 0 || dims.height <= 0) {
    return { width: fallbackSize, height: fallbackSize };
  }
  const aspect = dims.width / dims.height;
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return { width, height };
}

function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

function cleanText(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.toLocaleString('en', { month: 'long' });
      const year = d.getFullYear();

      let suffix = 'th';
      if (day === 1 || day === 21 || day === 31) suffix = 'st';
      else if (day === 2 || day === 22) suffix = 'nd';
      else if (day === 3 || day === 23) suffix = 'rd';

      return `${day}${suffix} ${month} ${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export async function generateAidesMemoPdf(params: AideMemoParams): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  let cursorY = 40;

  // Use 'helvetica' — built-in sans-serif closest to Tahoma
  const FONT = 'helvetica';

  // ── Crest (left side) ──────────────────────────────────────────────────────
  const crestDataUrl = await urlToDataUrl(params.crestUrl);
  const crestMaxHeight = 55;
  const crestMaxWidth = 90;
  let crestW = crestMaxHeight;
  let crestH = crestMaxHeight;

  if (crestDataUrl) {
    const scaled = await getScaledImageSize(crestDataUrl, crestMaxWidth, crestMaxHeight, crestMaxHeight);
    crestW = scaled.width;
    crestH = scaled.height;
    doc.addImage(crestDataUrl, detectImageFormat(crestDataUrl), margin, cursorY, crestW, crestH);
  }

  // ── Title block (next to crest, left-aligned) ────────────────────────────
  const titleX = margin + crestW + 16;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(15);
  doc.text('THE JUDICIARY', titleX, cursorY + 18);

  doc.setFontSize(12);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', titleX, cursorY + 38);

  // Move cursor to just below the crest
  cursorY += crestH + 12;

  // ── Gold divider directly under the header ──────────────────────────────
  doc.setDrawColor(201, 168, 76); // #c9a84c
  doc.setLineWidth(1.2);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  doc.setDrawColor(0, 0, 0);
  cursorY += 20;

  // ── Reference and Date line ──────────────────────────────────────────────
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  doc.text(`Ref: ${params.ref}`, margin, cursorY);
  doc.text(formatDate(params.date), pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 28;

  // ── TO block ──────────────────────────────────────────────────────────────
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);

  const toText = params.to;
  const toLines = doc.splitTextToSize(toText, pageWidth - margin * 2);
  doc.text(toLines, margin, cursorY);
  cursorY += toLines.length * 16 + 2;

  doc.setFont(FONT, 'normal');
  const addressLines = buildToAddressLines(params);
  addressLines.forEach((line) => {
    doc.text(line, margin, cursorY);
    cursorY += 16;
  });

  if (params.toCity) {
    doc.setFont(FONT, 'bold');
    doc.text(params.toCity, margin, cursorY);
    cursorY += 24;
  } else {
    cursorY += 8;
  }

  // ── Subject (RE:) — Helvetica Bold 12pt ───────────────────────────────────
  doc.setFont(FONT, 'bold');
  doc.setFontSize(12);
  const subjectText = `RE: ${params.subject.toUpperCase()}`;
  const subjectLines = doc.splitTextToSize(subjectText, pageWidth - margin * 2);
  doc.text(subjectLines, margin, cursorY);

  doc.setLineWidth(0.8);
  subjectLines.forEach((line: string, i: number) => {
    const w = doc.getTextWidth(line);
    const y = cursorY + i * 16 + 2;
    doc.line(margin, y, margin + w, y);
  });
  cursorY += subjectLines.length * 16 + 10;

  // ── Body ──────────────────────────────────────────────────────────────────
  doc.setFont(FONT, 'normal');
  doc.setFontSize(12);
  cursorY += 10;

  const greetingText = params.greetingText || 'Greetings from the Office of the Registrar, High Court.';
  const greetingLines = doc.splitTextToSize(cleanText(greetingText), pageWidth - margin * 2);
  doc.text(greetingLines, margin, cursorY);
  cursorY += greetingLines.length * 16 + 8;

  const bodyLines = doc.splitTextToSize(cleanText(params.bodyText), pageWidth - margin * 2);
  doc.text(bodyLines, margin, cursorY);
  cursorY += bodyLines.length * 16 + 8;

  // ─── Officer suitability paragraph ────────────────────────────────────────
  if (params.officerSuitabilityText) {
    const officerLines = doc.splitTextToSize(cleanText(params.officerSuitabilityText), pageWidth - margin * 2);
    doc.text(officerLines, margin, cursorY);
    cursorY += officerLines.length * 16 + 8;
  }

  // ─── Closing paragraph ──────────────────────────────────────────────────
  const closingText =
    params.closingText ||
    'We take this opportunity to thank you for your continued partnership and kindly request your favourable consideration of this matter.';
  const closingLines = doc.splitTextToSize(cleanText(closingText), pageWidth - margin * 2);
  doc.text(closingLines, margin, cursorY);
  cursorY += closingLines.length * 16 + 20;

  // ─── Yours sincerely ─────────────────────────────────────────────────────
  doc.setFont(FONT, 'bold');
  doc.text('Yours sincerely,', margin, cursorY);

  // ─── Signature Block ──────────────────────────────────────────────────────
  const SIGNATURE_BLOCK_HEIGHT = 130;
  cursorY += 30;

  const footerTopY = pageHeight - 78;
  if (cursorY + SIGNATURE_BLOCK_HEIGHT + 40 > footerTopY) {
    doc.addPage();
    cursorY = 60;
  }

  cursorY += SIGNATURE_BLOCK_HEIGHT;

  // ─── Copy to (CC) ────────────────────────────────────────────────────────
  const maxCcY = footerTopY - 10;
  const ccCount = params.ccList?.length || 0;
  const ccHeight = 16 + ccCount * 18 + 8;

  if (ccCount > 0) {
    if (cursorY + ccHeight > maxCcY) {
      doc.addPage();
      cursorY = 60;
    }

    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.text('Copy to:', margin, cursorY);
    cursorY += 16;

    doc.setFont(FONT, 'normal');
    doc.setFontSize(11);
    params.ccList!.forEach((cc, index) => {
      const ccText = `${index + 1}. ${cc}`;
      const ccLines = doc.splitTextToSize(ccText, pageWidth - margin * 2);
      doc.text(ccLines, margin + 20, cursorY);
      cursorY += ccLines.length * 16 + 2;
    });
    cursorY += 8;
  }

  // ─── Footer ──────────────────────────────────────────────────────────────
  const footerY = pageHeight - 78;

  doc.setLineWidth(0.7);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  const footerEmblemDataUrl = await urlToDataUrl(FOOTER_EMBLEM_SRC);
  if (footerEmblemDataUrl) {
    const footerScaled = await getScaledImageSize(footerEmblemDataUrl, 50, 38, 38);
    doc.addImage(
      footerEmblemDataUrl,
      detectImageFormat(footerEmblemDataUrl),
      margin,
      footerY + 8,
      footerScaled.width,
      footerScaled.height,
    );
  }

  const footerTextX = pageWidth - margin;
  const footerTextStartY = footerY + 10;

  doc.setFont(FONT, 'oblique'); // Standard italic equivalent in Helvetica
  doc.setFontSize(8);
  doc.setTextColor(85, 85, 85);
  doc.text('Social Transformation through Access to Justice', footerTextX, footerTextStartY, { align: 'right' });

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  doc.text(
    'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
    footerTextX,
    footerTextStartY + 11,
    { align: 'right' },
  );

  doc.text(
    'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
    footerTextX,
    footerTextStartY + 22,
    { align: 'right' },
  );

  doc.setFont(FONT, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 61, 28);
  doc.text('Justice Be Our Shield and Defender', footerTextX, footerTextStartY + 33, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return doc.output('blob');
}

// ─── Helper to build a first-draft AideMemoParams from the request form ────

export function buildAideMemoParams(data: {
  judgeName: string;
  judgeTitle?: string;
  judgeLocation?: string;
  officerName: string;
  officerRank: string;
  officerNumber: string;
  currentStation: string;
  assignmentType: string;
  requestDate: string;
  refNumber: string;
  signatoryName?: string;
  signatoryTitle?: string;
  fromDepartment?: string;
  additionalNotes?: string;
  toTitle?: string;
  toOrganization?: string;
  toBuilding?: string;
  toPOBox?: string;
  toCity?: string;
}): AideMemoParams {
  const assignmentLabels: Record<string, string> = {
    bodyguard: 'Bodyguard',
    driver: 'Driver',
    close_escort: 'Close Escort',
    sentry: 'Sentry',
  };

  const assignmentDisplay = assignmentLabels[data.assignmentType.toLowerCase()] || data.assignmentType;
  const rankAbbrev = getRankAbbreviation(data.officerRank);
  const judgeTitle = data.judgeTitle || 'Judge of the High Court';

  const subject = `Request for Attachment of ${rankAbbrev} ${data.officerName} (No. ${data.officerNumber}) as a ${assignmentDisplay} to Hon. ${data.judgeName}, ${judgeTitle}`;

  const bodyText = `Pursuant to the continued collaboration between the Judiciary and the ${
    data.toOrganization || 'Kenya Police Service'
  } in facilitating judicial functions, we wish to request the attachment of ${rankAbbrev}. ${data.officerName}, currently stationed at ${data.currentStation}, to serve as a ${assignmentDisplay.toLowerCase()} to ${data.judgeName}, ${judgeTitle}.${
    data.additionalNotes ? `\n\n${data.additionalNotes}` : ''
  }`;

  const officerSuitabilityText = `The above-named officer (${rankAbbrev}. ${data.officerName}) has been identified as suitable for the assignment, and his/her attachment will greatly facilitate the efficient discharge of the Judge's official duties.`;

  const ccList = [
    `${data.judgeName}${data.judgeLocation ? `, ${data.judgeLocation}` : ''}`,
    'In-Charge, Judiciary Police Unit',
  ];

  return {
    ref: data.refNumber,
    date: data.requestDate,
    to: data.toTitle || 'The Deputy Inspector General',
    toOrganization: data.toOrganization || 'Kenya Police Service',
    toBuilding: data.toBuilding || 'Vigilance House',
    toPOBox: data.toPOBox || 'P.O. Box 53258-00200',
    toCity: data.toCity || 'NAIROBI.',
    subject,
    bodyText,
    officerSuitabilityText,
    judgeName: data.judgeName,
    judgeTitle,
    judgeLocation: data.judgeLocation,
    officerName: data.officerName,
    officerRank: data.officerRank,
    officerNumber: data.officerNumber,
    currentStation: data.currentStation,
    assignmentType: assignmentDisplay,
    ccList,
    crestUrl: 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg',
  };
}