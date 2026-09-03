// generateSensitizationPdf.ts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

// ─── Theme ──────────────────────────────────────────────────────────────────
const GOLD: [number, number, number] = [201, 168, 76];
const DARK_GREEN: [number, number, number] = [26, 61, 28];
const GRID_GREY: [number, number, number] = [170, 170, 170];
const TABLE_HEADER_FILL: [number, number, number] = GOLD;
const TABLE_HEADER_TEXT: [number, number, number] = DARK_GREEN;

type CellLineWidth = number | Partial<{ top: number; right: number; bottom: number; left: number }>;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchImageDataUrl(url: string): Promise<string | null> {
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

const formatAmount = (amount: number): string => {
  const n = Number(amount);
  return n > 0
    ? n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
};

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateSensitizationPdf(data: {
  date: string;
  from: string;
  to: string;
  subject: string;
  location: string;
  travelStartDate: string;
  travelEndDate: string;
  sensitizationPeriod: string;
  teamMembers: Array<{
    s_no: number;
    name: string;
    pjNumber: string;
    rank: string;
    days: number;
    dsaRate: number;
    total: number;
    isDriver?: boolean;
  }>;
  grandTotal: number;
  preparedBy: string;
  title: string;
  additionalContext?: string;
  crestUrl?: string;
  signature?: string | null;
  signatureName?: string;
  signatureTitle?: string;
  signatureDate?: string;
}): Promise<Blob> {
  const [crestDataUrl, footerEmblemDataUrl] = await Promise.all([
    fetchImageDataUrl(data.crestUrl || ''),
    fetchImageDataUrl(FOOTER_EMBLEM_SRC),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  let y = 44;

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
  y += 20;
  doc.setLineWidth(1.25);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 26;

  // ─── Header fields ──────────────────────────────────────────────────────
  doc.setFontSize(11);
  const headerField = (label: string, value: string) => {
    doc.setFont('times', 'bold');
    doc.text(`${label}:`, marginX, y);
    doc.text(value.toUpperCase(), marginX + 84, y);
    y += 18;
  };

  headerField('TO', data.to);
  headerField('FROM', data.from);
  headerField('DATE', data.date);

  doc.setFont('times', 'bold');
  doc.text('SUBJECT:', marginX, y);
  const subjectLines = doc.splitTextToSize(data.subject.toUpperCase(), pageWidth - marginX * 2 - 84);
  doc.text(subjectLines, marginX + 84, y);
  y += subjectLines.length * 16 + 6;

  doc.setLineWidth(1.25);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  // ─── Body text ──────────────────────────────────────────────────────────
  doc.setFont('times', 'normal');
  doc.setFontSize(11);

  const bodyParagraph = (text: string, gap = 12) => {
    const lines = doc.splitTextToSize(text, pageWidth - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 14.5 + gap;
  };

  bodyParagraph(
    `The Principal Registry has achieved an end-to-end automated process of its operations. Consequently, and pursuant to the Hon. Chief Registrar's memo on implementation of automated processing of gazette notices in succession causes, all stations are required to submit these notices through the CTS.`
  );

  bodyParagraph(
    `The Principal Registry is committed to sensitizing the Judicial Officers and staff on the key features of the automated P&A processes to ensure efficiency in handling of cases. In this regard and following the upcoming visit of the Hon. Chief Justice to ${data.location} whose aim is to review initiatives aimed at improving access to justice, service delivery and case management.`
  );

  if (data.additionalContext) {
    bodyParagraph(data.additionalContext);
  }

  bodyParagraph(
    `I request that a team from Principal Registry visits ${data.location} for sensitization from ${data.sensitizationPeriod} (travel dates ${data.travelStartDate} to ${data.travelEndDate}).`
  );

  bodyParagraph('We request for approval and facilitation of DSA as tabulated below:', 8);
  y += 12;

  // ────────────────────────── Table ──────────────────────────────────────
  const rows = data.teamMembers.map((member) => [
    String(member.s_no),
    member.name,
    member.pjNumber,
    member.rank,
    String(member.days),
    formatAmount(member.dsaRate),
    formatAmount(member.total),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX, bottom: footerReserveHeight },
    head: [['NO.', 'Name', 'PJ', 'Rank', 'No. of Days', 'DSA Rate', 'Total']],
    body: rows,
    foot: [[
      { content: 'TOTAL', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatAmount(data.grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    showFoot: 'lastPage',
    tableWidth: pageWidth - marginX * 2,
    styles: {
      font: 'times',
      fontSize: 10,
      cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
      lineColor: GRID_GREY,
      lineWidth: 0.6,
      textColor: [20, 20, 20] as [number, number, number],
      valign: 'middle',
    },
    headStyles: {
      fillColor: TABLE_HEADER_FILL,
      textColor: TABLE_HEADER_TEXT,
      fontStyle: 'bold' as const,
      fontSize: 10.5,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
      lineColor: TABLE_HEADER_TEXT,
      lineWidth: { top: 0.6, bottom: 1.1, left: 0.6, right: 0.6 } as CellLineWidth,
    },
    footStyles: {
      fillColor: TABLE_HEADER_FILL,
      textColor: TABLE_HEADER_TEXT,
      fontSize: 10.5,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
      lineColor: TABLE_HEADER_TEXT,
      lineWidth: { top: 1.1, bottom: 0.6, left: 0.6, right: 0.6 } as CellLineWidth,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248] as [number, number, number],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'left', cellWidth: 125 },
      2: { halign: 'center', cellWidth: 62 },
      3: { halign: 'left', cellWidth: 65 },
      4: { halign: 'center', cellWidth: 62 },
      5: { halign: 'right', cellWidth: 68 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 78 },
    },
  });

  // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
  y = doc.lastAutoTable.finalY + 24;

  // ─── Signature Block (Compact: Signature → Name → Designation) ──────────────
  const hasSignature = !!data.signature && data.signature.trim().length > 0;
  const hasSignatureName = !!data.signatureName && data.signatureName.trim().length > 0;
  const hasSignatureTitle = !!data.signatureTitle && data.signatureTitle.trim().length > 0;

  // Calculate compact space needed
  let spaceNeeded = 10; // Tiny padding
  if (hasSignature) {
    spaceNeeded += 45; // Smaller image
  }
  if (hasSignatureName) {
    spaceNeeded += 18; // Smaller name
  }
  if (hasSignatureTitle) {
    spaceNeeded += 18; // Smaller title
  }

  const spaceAvailable = footerY - y;

  // Only add new page if absolutely necessary
  if (spaceAvailable < spaceNeeded + 20) {
    doc.addPage();
    y = 60;
  }

  // ─── Signature Image ────────────────────────────────────────────────────
  if (hasSignature && data.signature) {
    try {
      const sigDataUrl = data.signature as string;
      const sigFormat = detectImageFormat(sigDataUrl);
      
      const sigNaturalSize = await getImageNaturalSize(sigDataUrl);
      let sigWidth = 120; // Smaller width
      let sigHeight = 40; // Smaller height
      
      if (sigNaturalSize && sigNaturalSize.width > 0) {
        const aspectRatio = sigNaturalSize.height / sigNaturalSize.width;
        sigHeight = sigWidth * aspectRatio;
        if (sigHeight > 50) {
          sigHeight = 50;
          sigWidth = sigHeight / aspectRatio;
        }
      }
      
      doc.addImage(sigDataUrl, sigFormat, marginX, y, sigWidth, sigHeight);
      y += sigHeight + 6; // Reduced gap
    } catch (err) {
      console.warn('Failed to add signature image to PDF:', err);
    }
  }

  // ─── Signature Name (bold, underlined, uppercase) ────────────────────
  if (hasSignatureName && data.signatureName) {
    doc.setFont('times', 'bold');
    doc.setFontSize(10); // Smaller font
    doc.setTextColor(0, 0, 0);
    const displayName = data.signatureName.toUpperCase();
    const textWidth = doc.getTextWidth(displayName);
    doc.text(displayName, marginX, y);
    doc.setLineWidth(0.6);
    doc.line(marginX, y + 2, marginX + textWidth, y + 2);
    y += 16;
  }

  // ─── Signature Title (bold, underlined, uppercase) ────────────────────
  if (hasSignatureTitle && data.signatureTitle) {
    doc.setFont('times', 'bold');
    doc.setFontSize(10); // Smaller font
    doc.setTextColor(0, 0, 0);
    const displayTitle = data.signatureTitle.toUpperCase();
    const textWidth = doc.getTextWidth(displayTitle);
    doc.text(displayTitle, marginX, y);
    doc.setLineWidth(0.6);
    doc.line(marginX, y + 2, marginX + textWidth, y + 2);
    y += 16;
  }

  y += 12;

  // ── Footer ──────────────────────────────────────────────────────────────
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