// src/utils/generateConferenceMemoPdf.ts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConferenceMemoParams {
  // Header
  ref: string;
  date: string;

  // To/Address
  to: string;
  toOrganization?: string;
  toBuilding?: string;
  toPOBox?: string;
  toCity?: string;

  // Subject & Body
  /** Short case reference used ONLY in the subject line, e.g. "BENCH PETITION E051 OF 2026" */
  caseReference: string;
  /** Longer descriptive phrase used in the body sentence, e.g. "three-Judge bench handling
   * Constitution Petition E051 of 2026" */
  conferenceDescription: string;
  bodyText: string;
  conferenceDetailsText?: string;
  closingText?: string;

  // Conference / retreat specifics
  conferenceType: string; // e.g. "retreat"

  /** Dates the retreat itself is approved for (used in the body sentence) */
  retreatStartDate: string;
  retreatEndDate: string;

  /** Dates the conference facility is actually booked for (used in the table — may be a
   * narrower window than the retreat dates) */
  facilityStartDate: string;
  facilityEndDate: string;

  numberOfPax: number;
  venue: string;
  location: string;
  budgetEstimate?: number;
  judgeNames?: string[];

  /** Total supporting staff accompanying the bench — used in the body sentence */
  supportingStaff?: number;

  /** Headcount for the "Meals only (Drivers & Guards)" table row — distinct from
   * supportingStaff, do NOT default one from the other */
  driversAndGuardsCount?: number;

  /** Headcount for the "Secretariat room" table row */
  secretariatPax?: number;

  // ─── Entries for table ──────────────────────────────────────────────────
  entries?: {
    particulars: string;
    start_date: string;
    end_date: string;
    pax: number;
  }[];

  // Footer
  fromDepartment?: string;
  fromName?: string;
  fromTitle?: string;
  ccList?: string[];

  // ─── Signature ────────────────────────────────────────────────────────────
  signatureUrl?: string;

  // Images
  crestUrl: string;
  footerEmblemUrl?: string;
}

export interface ConferenceMemoBuilderParams {
  /** Required: the registry's actual assigned reference number, e.g. "RHC/AIE/112".
   * Never auto-generated — an auto-generated ref will not match the registry. */
  refNumber: string;
  requestDate: string;

  caseReference: string;
  conferenceDescription: string;
  conferenceType: string;

  retreatStartDate: string;
  retreatEndDate: string;

  facilityStartDate: string;
  facilityEndDate: string;

  numberOfPax: number;
  venue: string;
  location: string;
  budgetEstimate?: number;

  fromDepartment?: string;
  fromName?: string;
  fromTitle?: string;
  additionalNotes?: string;

  judgeNames?: string[];
  supportingStaff?: number;
  driversAndGuardsCount?: number;
  secretariatPax?: number;

  to?: string;
  ccList?: string[];
  crestUrl?: string;

  // ─── Signature ────────────────────────────────────────────────────────────
  signatureUrl?: string;

  // ─── Entries for table ──────────────────────────────────────────────────
  entries?: {
    particulars: string;
    start_date: string;
    end_date: string;
    pax: number;
  }[];
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildConferenceMemoParams(params: ConferenceMemoBuilderParams): ConferenceMemoParams {
  const {
    refNumber,
    requestDate,
    caseReference,
    conferenceDescription,
    conferenceType,
    retreatStartDate,
    retreatEndDate,
    facilityStartDate,
    facilityEndDate,
    numberOfPax,
    venue,
    location,
    budgetEstimate,
    fromDepartment = 'HIGH COURT SUPPORT OFFICE - ORHC',
    fromName = 'JOSLYNE NDUBI',
    fromTitle = 'HIGH COURT SUPPORT OFFICE-ORHC',
    additionalNotes,
    judgeNames = [],
    supportingStaff,
    driversAndGuardsCount,
    secretariatPax,
    to = 'REGISTRAR, HIGH COURT/ ORHC AIE HOLDER',
    ccList,
    crestUrl = '',
    signatureUrl,
    entries,
  } = params;

  // Required fields — fail loudly rather than silently generating a bogus ref/date/etc.
  const missing: string[] = [];
  if (!refNumber) missing.push('refNumber');
  if (!requestDate) missing.push('requestDate');
  if (!caseReference) missing.push('caseReference');
  if (!conferenceDescription) missing.push('conferenceDescription');
  if (!retreatStartDate) missing.push('retreatStartDate');
  if (!retreatEndDate) missing.push('retreatEndDate');
  if (!facilityStartDate) missing.push('facilityStartDate');
  if (!facilityEndDate) missing.push('facilityEndDate');
  if (numberOfPax === undefined || numberOfPax === null) missing.push('numberOfPax');
  if (missing.length > 0) {
    throw new Error(`buildConferenceMemoParams: missing required field(s): ${missing.join(', ')}`);
  }

  const retreatStartFormatted = formatDateForMemo(retreatStartDate);
  const retreatEndFormatted = formatDateForMemo(retreatEndDate);

  // Body text: describes the retreat approval using the RETREAT dates and the long
  // descriptive title, NOT the case reference used in the subject.
  const bodyText = `The Honourable Chief Justice, through the referenced letter, approved a ${conferenceType} for the ${conferenceDescription} to undertake judgment writing. The retreat is scheduled to take place from ${retreatStartFormatted} to ${retreatEndFormatted}.`;

  // Conference details paragraph
  let detailsText = '';
  if (judgeNames.length > 0) {
    const judgeList = judgeNames
      .map((name, index) => {
        if (index === judgeNames.length - 1 && judgeNames.length > 1) {
          return `and ${name}`;
        }
        return name;
      })
      .join(', ');

    if (supportingStaff === undefined || supportingStaff === null) {
      throw new Error(
        'buildConferenceMemoParams: supportingStaff is required when judgeNames are provided'
      );
    }
    detailsText += `The bench comprises ${judgeList}, who will be accompanied by ${numberToWords(
      supportingStaff
    )} (${supportingStaff}) supporting staff. `;
  }

  detailsText += `Their preferred venue for the retreat is ${venue}, ${location}.`;

  if (additionalNotes) {
    detailsText += ` ${additionalNotes}`;
  }

  return {
    ref: refNumber,
    date: requestDate,
    to,
    toOrganization: '',
    toBuilding: '',
    toPOBox: '',
    toCity: '',
    caseReference,
    conferenceDescription,
    bodyText,
    conferenceDetailsText: detailsText,
    closingText:
      'In view of the foregoing, kindly approve the procurement of conference facilities for the retreat at the above-mentioned venue, in accordance with the schedule set out below.',
    conferenceType,
    retreatStartDate,
    retreatEndDate,
    facilityStartDate,
    facilityEndDate,
    numberOfPax,
    venue,
    location,
    budgetEstimate,
    judgeNames,
    supportingStaff,
    driversAndGuardsCount,
    secretariatPax,
    fromDepartment,
    fromName,
    fromTitle,
    ccList: ccList ?? [
      'Principal Secretary, State Department of Justice',
      'Director, Judiciary Training Institute',
    ],
    crestUrl,
    signatureUrl,
    entries: entries || [],
  };
}

// ─── Theme ──────────────────────────────────────────────────────────────────
// Matches the app's judiciary gold / dark-green design system.
const GOLD: [number, number, number] = [201, 168, 76]; // #c9a84c
const DARK_GREEN: [number, number, number] = [26, 61, 28]; // #1a3d1c
const GRID_GREY: [number, number, number] = [170, 170, 170];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getImageNaturalSize(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

function formatDateForMemo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleString('en', { month: 'long' });
    const year = d.getFullYear();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${day}${suffix} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.toLocaleString('en', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
];

/** Spells out small integers (matches the "eleven (11)" style used in real memos).
 * Falls back to the numeral itself above twenty. */
function numberToWords(n: number): string {
  if (Number.isInteger(n) && n >= 0 && n < NUMBER_WORDS.length) {
    return NUMBER_WORDS[n];
  }
  return String(n);
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateConferenceMemoPdf(params: ConferenceMemoParams): Promise<Blob> {
  const FOOTER_EMBLEM_SRC =
    'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

  const [crestDataUrl, footerEmblemDataUrl, signatureDataUrl] = await Promise.all([
    fetchImageDataUrl(params.crestUrl),
    fetchImageDataUrl(params.footerEmblemUrl || FOOTER_EMBLEM_SRC),
    fetchImageDataUrl(params.signatureUrl || ''),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  let y = 44;

  // Reserve space at the bottom of every page for the footer
  const footerY = pageHeight - 85;
  const footerBlockH = 75;
  const footerReserveHeight = pageHeight - footerY + footerBlockH + 12;

  // ── Crest ────────────────────────────────────────────────────────────────
  if (crestDataUrl) {
    const crestTargetWidth = 190;
    const crestW = crestTargetWidth;
    let crestH = crestTargetWidth * 0.5;

    const naturalSize = await getImageNaturalSize(crestDataUrl);
    if (naturalSize && naturalSize.width > 0) {
      const aspectRatio = naturalSize.height / naturalSize.width;
      crestH = crestTargetWidth * aspectRatio;
    }

    doc.addImage(
      crestDataUrl,
      detectImageFormat(crestDataUrl),
      pageWidth / 2 - crestW / 2,
      y,
      crestW,
      crestH
    );
    y += crestH + 18;
  }

  // ─── Title block ──────────────────────────────────────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, y, { align: 'center' });
  y += 24;
  doc.setFontSize(13.5);
  doc.text('INTERNAL MEMO', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setLineWidth(1.25);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 26;

  // ── Header fields ──────────────────────────────────────────────────────
  doc.setFontSize(11);
  const headerField = (label: string, value: string) => {
    doc.setFont('times', 'bold');
    doc.text(`${label}`, marginX, y);
    doc.text(':', marginX + 70, y);
    doc.setFont('times', 'normal');
    const usableWidth = pageWidth - marginX * 2 - 84;
    const lines = doc.splitTextToSize(value, usableWidth);
    doc.text(lines, marginX + 84, y);
    y += lines.length * 16 + 2;
  };

  doc.setFont('times', 'bold');
  headerField('FROM', (params.fromDepartment || 'HIGH COURT SUPPORT OFFICE - ORHC').toUpperCase());
  headerField('TO', params.to.toUpperCase());
  headerField('REF', params.ref);
  headerField('DATE', formatDateForMemo(params.date));
  // Subject uses the SHORT case reference, e.g. "BENCH PETITION E051 OF 2026" — not the
  // longer body description.
  headerField(
    'SUBJECT',
    `REQUEST FOR PROCUREMENT OF CONFERENCE FACILITIES -- ${params.caseReference}`.toUpperCase()
  );

  doc.setLineWidth(1.25);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 22;

  // ── Body text ──────────────────────────────────────────────────────────
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const usableWidth = pageWidth - marginX * 2;

  const bodyParagraphs = params.bodyText.split('\n\n').filter((p: string) => p.trim().length > 0);
  bodyParagraphs.forEach((para: string) => {
    const lines = doc.splitTextToSize(para, usableWidth);
    doc.text(lines, marginX, y);
    y += lines.length * 14.5 + 10;
  });

  // Conference details
  if (params.conferenceDetailsText) {
    const detailsParagraphs = params.conferenceDetailsText
      .split('\n\n')
      .filter((p: string) => p.trim().length > 0);
    detailsParagraphs.forEach((para: string) => {
      const lines = doc.splitTextToSize(para, usableWidth);
      doc.text(lines, marginX, y);
      y += lines.length * 14.5 + 10;
    });
  }

  y += 8;

  // ─── Closing text (MOVED ABOVE TABLE) ──────────────────────────────────
  if (params.closingText) {
    const closingParagraphs = params.closingText
      .split('\n\n')
      .filter((p: string) => p.trim().length > 0);
    closingParagraphs.forEach((para: string) => {
      const lines = doc.splitTextToSize(para, usableWidth);
      doc.text(lines, marginX, y);
      y += lines.length * 14.5 + 10;
    });
    y += 8;
  }

  // ────────────────────────── Conference Table ──────────────────────────
  // Build rows dynamically from entries
  const entries = params.entries || [];

  if (entries.length === 0) {
    throw new Error('generateConferenceMemoPdf: No entries provided for the table');
  }

  const tableRows: (string | number)[][] = entries.map((entry, index) => {
    const dateRange = `${formatDateShort(entry.start_date)} to ${formatDateShort(entry.end_date)}`;
    return [
      String(index + 1),
      entry.particulars,
      dateRange,
      String(entry.pax),
    ];
  });

  // Add total row if more than one entry
  if (entries.length > 1) {
    const totalPax = entries.reduce((sum, e) => sum + e.pax, 0);
    tableRows.push(['', '', 'TOTAL', String(totalPax)]);
  }

  const sharedTableStyle = {
    theme: 'grid' as const,
    showFoot: 'lastPage' as const,
    styles: {
      font: 'times',
      fontSize: 10,
      cellPadding: 7,
      lineColor: GRID_GREY,
      lineWidth: 0.6,
      textColor: [30, 30, 30] as [number, number, number],
    },
    headStyles: {
      fillColor: GOLD,
      textColor: DARK_GREEN,
      fontStyle: 'bold' as const,
      halign: 'left' as const,
      fontSize: 10.5,
      cellPadding: 8,
      lineColor: GRID_GREY,
      lineWidth: 0.6,
    },
    alternateRowStyles: {
      fillColor: [250, 249, 246] as [number, number, number],
    },
  };

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX, bottom: footerReserveHeight },
    head: [['S/No', 'Particulars', 'Dates', 'Pax']],
    body: tableRows,
    ...sharedTableStyle,
    columnStyles: {
      0: { halign: 'center', cellWidth: 45 },
      1: { cellWidth: 220 },
      2: { cellWidth: 150 },
      3: { halign: 'center', cellWidth: 50 },
    },
  });

  // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
  y = doc.lastAutoTable.finalY + 20;

  // ─── Signature Block ────────────────────────────────────────────────────
  // Add spacing before signature block
  y += 20;

  // Minimum space needed for name + title + signature image
  const hasSignature = !!signatureDataUrl;
  const minSpaceNeeded = hasSignature ? 160 : 90;

  // Check if the signature block will fit on the current page
  if (y + minSpaceNeeded > footerY - 20) {
    doc.addPage();
    y = 60;
  }

  // Signature image (if available)
  if (signatureDataUrl) {
    const signatureTargetWidth = 120;
    let signatureH = 40;
    const naturalSize = await getImageNaturalSize(signatureDataUrl);
    if (naturalSize && naturalSize.width > 0) {
      const aspectRatio = naturalSize.height / naturalSize.width;
      signatureH = signatureTargetWidth * aspectRatio;
    }
    
    doc.addImage(
      signatureDataUrl,
      detectImageFormat(signatureDataUrl),
      marginX,
      y,
      signatureTargetWidth,
      signatureH
    );
    y += signatureH + 15;
  }

  // Signatory name - add small spacing before name
  if (!hasSignature) {
    y += 5;
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  const signatoryName = params.fromName || 'REGISTRAR HIGH COURT';
  doc.text(signatoryName, marginX, y);
  y += 22;

  // Designation with underline
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const title = params.fromTitle || 'OFFICE OF THE REGISTRAR HIGH COURT';
  doc.text(title, marginX, y);

  const titleWidth = doc.getTextWidth(title);
  doc.setLineWidth(0.5);
  doc.line(marginX, y + 2, marginX + titleWidth, y + 2);
  y += 28;

  // ─── Copy to (CC) ──────────────────────────────────────────────────────
  if (params.ccList && params.ccList.length > 0) {
    const ccSpaceNeeded = 16 + params.ccList.length * 16 + 10;
    if (y + ccSpaceNeeded > footerY - 20) {
      doc.addPage();
      y = 60;
    }
    
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('Copy to:', marginX, y);
    y += 14;
    doc.setFont('times', 'normal');
    params.ccList.forEach((cc: string, index: number) => {
      doc.text(`${index + 1}. ${cc}`, marginX, y);
      y += 14;
    });
    y += 8;
  }

  // ── Footer (rendered on the final page) ──────────────────────────────────
  let footerRenderW = 100;
  let footerRenderH = 35;

  const footerNaturalSize = footerEmblemDataUrl
    ? await getImageNaturalSize(footerEmblemDataUrl)
    : null;
  if (footerNaturalSize && footerNaturalSize.height > 0) {
    const aspectRatio = footerNaturalSize.width / footerNaturalSize.height;
    footerRenderH = 35;
    footerRenderW = footerRenderH * aspectRatio;
  }

  const drawPageFooter = () => {
    doc.setLineWidth(1);
    doc.setDrawColor(...GOLD);
    doc.line(marginX, footerY, pageWidth - marginX, footerY);

    const logoTopY = footerY + 12;

    if (footerEmblemDataUrl) {
      doc.addImage(
        footerEmblemDataUrl,
        detectImageFormat(footerEmblemDataUrl),
        marginX,
        logoTopY,
        footerRenderW,
        footerRenderH
      );
    }

    const rightMargin = pageWidth - marginX;
    let textY = footerY + 16;



    textY += 13;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(
      'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
      rightMargin,
      textY,
      { align: 'right' }
    );

    textY += 11.5;
    doc.text(
      'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
      rightMargin,
      textY,
      { align: 'right' }
    );

    textY += 14;
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...DARK_GREEN);
    doc.text('Justice Be Our Shield and Defender', rightMargin, textY, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  };

  drawPageFooter();

  return doc.output('blob');
}