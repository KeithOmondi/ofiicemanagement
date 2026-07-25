// src/utils/generateSentryMemoPdf.ts
//
// Builds a printable PDF memo for SENTRY (Residence Security) requests
// Returns a Blob for upload or download.

import jsPDF from 'jspdf';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

export interface SentryMemoParams {
  // Header fields
  ref: string;
  date: string;
  to: string;
  toOrganization: string;
  toBuilding?: string;
  toPOBox?: string;
  toCity?: string;
  subject: string;
  
  // Body
  bodyText: string;
  greetingText?: string;
  closingText?: string;
  
  // Judge details
  judgeName: string;
  judgeTitle?: string;
  judgeLocation?: string;
  residenceAddress: string;
  numberOfOfficers: number;
  
  // Signature
  signatoryName: string;
  signatoryTitle: string;
  fromDepartment?: string;
  initials?: string; // e.g., "COO/KO" at the bottom
  
  // Copies (CC)
  ccList?: string[];
  
  // Images
  crestUrl: string;
  signatureUrl?: string;
}

// ─── Shared helpers ──────────────────────────────────────────────────────

export function buildSentryToAddressLines(params: Pick<SentryMemoParams, 'toOrganization' | 'toBuilding' | 'toPOBox'>): string[] {
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

/**
 * Loads an image and returns its natural pixel dimensions so callers can
 * scale it into a target box without distorting its aspect ratio.
 * Returns null if the image can't be loaded/measured.
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Given a data URL and a target box, returns width/height that fit inside
 * the box while preserving the image's real aspect ratio. Falls back to a
 * square of `fallbackSize` if the image can't be measured.
 */
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

export async function generateSentryMemoPdf(params: SentryMemoParams): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  let cursorY = 40;

  // ── Crest (left side) ──────────────────────────────────────────────────────
  // Scaled proportionally to its real aspect ratio instead of forced into a
  // fixed square, so wide/tall crest images don't look squished or stretched.
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
  // Arial isn't a built-in jsPDF font; 'helvetica' is its closest metric
  // match and is what jsPDF/PDF viewers substitute for Arial.
  const titleX = margin + crestW + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('THE JUDICIARY', titleX, cursorY + 18);

  doc.setFontSize(12);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', titleX, cursorY + 38);

  cursorY += crestH + 12;

  // ── Gold divider directly under the header ──────────────────────────────
  doc.setDrawColor(201, 168, 76); // #c9a84c
  doc.setLineWidth(1.2);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  doc.setDrawColor(0, 0, 0);
  cursorY += 20;

  // ── Reference and Date line ──────────────────────────────────────────────
  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(12);
  doc.text(`Ref: ${params.ref}`, margin, cursorY);
  doc.text(formatDate(params.date), pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 28;

  // ── TO block ──────────────────────────────────────────────────────────────
  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(12);
  
  // toText without trailing comma (comma is added by the address lines)
  const toText = params.to;
  const toLines = doc.splitTextToSize(toText, pageWidth - margin * 2);
  doc.text(toLines, margin, cursorY);
  cursorY += toLines.length * 16 + 2;

  doc.setFont('Times-Roman', 'normal');
  const addressLines = buildSentryToAddressLines(params);
  addressLines.forEach((line) => {
    doc.text(line, margin, cursorY);
    cursorY += 16;
  });

  if (params.toCity) {
    doc.setFont('Times-Roman', 'bold');
    doc.text(params.toCity, margin, cursorY);
    cursorY += 24;
  } else {
    cursorY += 8;
  }

  // ── Subject ──────────────────────────────────────────────────────────────
  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(12);
  const subjectText = `RE: ${params.subject.toUpperCase()}`;
  const subjectLines = doc.splitTextToSize(subjectText, pageWidth - margin * 2);
  doc.text(subjectLines, margin, cursorY);
  // underline the subject block
  doc.setLineWidth(0.8);
  subjectLines.forEach((line: string, i: number) => {
    const w = doc.getTextWidth(line);
    const y = cursorY + i * 16 + 2;
    doc.line(margin, y, margin + w, y);
  });
  cursorY += subjectLines.length * 16 + 10;

  // ── Body ──────────────────────────────────────────────────────────────────
  doc.setFont('Times-Roman', 'normal');
  doc.setFontSize(12);

  // Extra breathing room before the salutation so it doesn't sit flush
  // under the subject's underline.
  cursorY += 10;

  const greetingText = params.greetingText || 'Greetings from the Office of the Registrar, High Court.';
  const greetingLines = doc.splitTextToSize(cleanText(greetingText), pageWidth - margin * 2);
  doc.text(greetingLines, margin, cursorY);
  cursorY += greetingLines.length * 16 + 8;

  const bodyLines = doc.splitTextToSize(cleanText(params.bodyText), pageWidth - margin * 2);
  doc.text(bodyLines, margin, cursorY);
  cursorY += bodyLines.length * 16 + 8;

  // ─── Closing paragraph ──────────────────────────────────────────────────
  const closingText = params.closingText || 
    'We take this opportunity to express our sincere appreciation for the continued support and partnership extended by the Administration Police Service. We kindly request your favourable consideration of this request.';
  const closingLines = doc.splitTextToSize(cleanText(closingText), pageWidth - margin * 2);
  doc.text(closingLines, margin, cursorY);
  cursorY += closingLines.length * 16 + 20;

  // ─── Yours sincerely ─────────────────────────────────────────────────────
  doc.setFont('Times-Roman', 'bold');
  doc.text('Yours sincerely,', margin, cursorY);
  cursorY += 24;

  // ─── Signature area ──────────────────────────────────────────────────────
  const signatureDataUrl = params.signatureUrl ? await urlToDataUrl(params.signatureUrl) : null;

  if (signatureDataUrl) {
    // Preserve the signature's real aspect ratio within its allotted box.
    const sigScaled = await getScaledImageSize(signatureDataUrl, 130, 48, 48);
    doc.addImage(
      signatureDataUrl,
      detectImageFormat(signatureDataUrl),
      margin,
      cursorY,
      sigScaled.width,
      sigScaled.height,
    );
    cursorY += sigScaled.height + 4;
  } else {
    cursorY += 20;
  }

  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(12);
  doc.text(cleanText(params.signatoryName), margin, cursorY);
  cursorY += 16;

  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(11);
  const titleText = cleanText(params.signatoryTitle);
  doc.text(titleText, margin, cursorY);
  const titleWidth = doc.getTextWidth(titleText);
  doc.setLineWidth(0.7);
  doc.line(margin, cursorY + 2, margin + titleWidth, cursorY + 2);
  cursorY += 14;

  if (params.fromDepartment) {
    doc.setFont('Times-Roman', 'normal');
    doc.setFontSize(11);
    doc.text(cleanText(params.fromDepartment), margin, cursorY);
    cursorY += 12;
  }

  cursorY += 8;

  // ─── Initials (e.g., COO/KO) ─────────────────────────────────────────────
  if (params.initials) {
    doc.setFont('Times-Roman', 'bold');
    doc.setFontSize(10);
    doc.text(cleanText(params.initials), margin, cursorY);
    cursorY += 16;
  }

  cursorY += 8;

  // ─── Copy to (CC) ────────────────────────────────────────────────────────
  if (params.ccList && params.ccList.length > 0) {
    doc.setFont('Times-Roman', 'bold');
    doc.setFontSize(11);
    doc.text('Copy to:', margin, cursorY);
    cursorY += 16;

    doc.setFont('Times-Roman', 'normal');
    doc.setFontSize(11);
    params.ccList.forEach((cc, index) => {
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
    // Same proportional-scaling treatment as the header crest.
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

  doc.setFont('Times-Roman', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(85, 85, 85);
  doc.text('Social Transformation through Access to Justice', footerTextX, footerTextStartY, { align: 'right' });

  doc.setFont('Times-Roman', 'normal');
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

  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 61, 28);
  doc.text('Justice Be Our Shield and Defender', footerTextX, footerTextStartY + 33, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return doc.output('blob');
}

// ─── Helper function to create Sentry memo parameters from form data ──────────

export function buildSentryMemoParams(data: {
  judgeName: string;
  judgeTitle?: string;
  judgeLocation?: string;
  residenceAddress: string;
  numberOfOfficers: number;
  requestDate: string;
  refNumber: string;
  signatoryName: string;
  signatoryTitle: string;
  fromDepartment?: string;
  initials?: string;
  additionalNotes?: string;
  toTitle?: string;
  toOrganization?: string;
  toBuilding?: string;
  toPOBox?: string;
  toCity?: string;
}): SentryMemoParams {
  const officerCountText = data.numberOfOfficers === 1 ? 'ONE (1)' : 'TWO (2)';
  const officerPlural = data.numberOfOfficers > 1 ? 's' : '';
  
  const subject = `REQUEST FOR ATTACHMENT OF ${officerCountText} POLICE OFFICER${officerPlural.toUpperCase()} TO THE RESIDENCE OF ${data.judgeName.toUpperCase()}`;

  const bodyText = `Pursuant to the continued collaboration between the Judiciary and the Administration Police Service in facilitating judicial functions, we wish to request the attachment of ${data.numberOfOfficers === 1 ? 'one (1)' : 'two (2)'} Administration Police officer${officerPlural} to provide sentry services at the residence of ${data.judgeName}${data.judgeTitle ? `, ${data.judgeTitle}` : ''}, in ${data.residenceAddress}.${data.additionalNotes ? `\n\n${data.additionalNotes}` : ''}`;

  const ccList = [
    `${data.judgeName}${data.judgeLocation ? `, ${data.judgeLocation}` : ''}`,
    'In-Charge, Judiciary Police Unit',
  ];

  return {
    ref: data.refNumber,
    date: data.requestDate,
    to: data.toTitle || 'The Deputy Inspector General',
    toOrganization: data.toOrganization || 'Administration Police Service',
    toBuilding: data.toBuilding || 'Jogoo House',
    toPOBox: data.toPOBox || 'P.O. Box 53258-00200',
    toCity: data.toCity || 'NAIROBI.',
    subject: subject,
    bodyText: bodyText,
    greetingText: 'Greetings from the Office of the Registrar, High Court.',
    closingText: 'We take this opportunity to express our sincere appreciation for the continued support and partnership extended by the Administration Police Service. We kindly request your favourable consideration of this request.',
    judgeName: data.judgeName,
    judgeTitle: data.judgeTitle,
    judgeLocation: data.judgeLocation,
    residenceAddress: data.residenceAddress,
    numberOfOfficers: data.numberOfOfficers,
    signatoryName: data.signatoryName,
    signatoryTitle: data.signatoryTitle,
    fromDepartment: data.fromDepartment,
    initials: data.initials,
    ccList: ccList,
    crestUrl: 'https://res.cloudinary.com/do0yflasl/image/upload/v1784363826/ORHC_L_crclut.jpg',
  };
}