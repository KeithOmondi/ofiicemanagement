// src/utils/generateAirTicketMemoPdf.ts
//
// Builds a printable PDF memo for AIR TICKET requests with a schedule table
// showing Name, Date, and Preferred Time (not DSA rates).
// Returns a Blob for upload or download.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { jsPDF as jsPDFType } from 'jspdf';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

export interface AirTicketScheduleRow {
  name: string;
  date: string;
  route: string;
  preferredTime: string;
}

export interface AirTicketMemoParams {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  scheduleRows: AirTicketScheduleRow[];
  signatoryName: string;
  crestUrl: string;
  signatureUrl?: string;
  fromDepartment?: string;
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

// ─── Helper: Clean text for PDF ──────────────────────────────────────────────
function cleanText(text: string): string {
  // Replace Unicode arrow with a simple ASCII alternative
  return text.replace(/→/g, '->').replace(/–/g, '-').replace(/—/g, '-');
}

export async function generateAirTicketMemoPdf(params: AirTicketMemoParams): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  let cursorY = 40;

  // ── Crest ────────────────────────────────────────────────────────────────
  const crestDataUrl = await urlToDataUrl(params.crestUrl);
  if (crestDataUrl) {
    const crestW = 120;
    const crestH = 60;
    doc.addImage(
      crestDataUrl,
      detectImageFormat(crestDataUrl),
      (pageWidth - crestW) / 2,
      cursorY,
      crestW,
      crestH,
    );
    cursorY += crestH + 16;
  }

  // ── Title block (Times New Roman, Bold, Larger) ──────────────────────────
  doc.setFont('Times-Roman', 'bold');
  
  // Main title - larger
  doc.setFontSize(20);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 26;
  
  // Sub title - slightly smaller but still bold
  doc.setFontSize(16);
  doc.text('INTERNAL MEMO', pageWidth / 2, cursorY, { align: 'center' });
  
  // Full width line under INTERNAL MEMO (thicker)
  doc.setLineWidth(2);
  doc.line(margin, cursorY + 6, pageWidth - margin, cursorY + 6);
  cursorY += 32;

  // ── TO / FROM / REF / DATE / SUBJECT (Bold Times New Roman) ─────────────
  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(12);
  const labelX = margin;
  const valueX = margin + 80;

  const writeLabelLine = (label: string, value: string, withBorder = false) => {
    // Clean the value text
    const cleanValue = cleanText(value);
    
    // Label in bold
    doc.setFont('Times-Roman', 'bold');
    doc.text(label, labelX, cursorY);
    doc.text(':', labelX + 65, cursorY);
    
    // Value in normal (not bold) but still Times New Roman
    doc.setFont('Times-Roman', 'normal');
    doc.text(cleanValue, valueX, cursorY);
    
    if (withBorder) {
      doc.setLineWidth(1.5);
      doc.line(margin, cursorY + 6, pageWidth - margin, cursorY + 6);
      cursorY += 10;
    }
    cursorY += 20;
  };

  writeLabelLine('TO', params.to.toUpperCase());
  writeLabelLine('FROM', params.from.toUpperCase());
  writeLabelLine('REF', params.ref);
  writeLabelLine('DATE', params.date);
  writeLabelLine('SUBJECT', params.subject.toUpperCase(), true);
  cursorY += 10;

  // ── Body (Times New Roman, Normal) ──────────────────────────────────────
  doc.setFont('Times-Roman', 'normal');
  doc.setFontSize(12);
  const cleanBodyText = cleanText(params.bodyText);
  const bodyLines = doc.splitTextToSize(cleanBodyText, pageWidth - margin * 2);
  doc.text(bodyLines, margin, cursorY);
  cursorY += bodyLines.length * 16 + 14;

  // ── Schedule Table (Times New Roman) ─────────────────────────────────────
  if (params.scheduleRows.length > 0) {
    const tableBody = params.scheduleRows.map((row) => {
      // Clean the route text - replace arrow with ASCII
      const cleanRoute = cleanText(row.route);
      return [
        row.name || '', // Empty string for return trips - shows as blank cell
        `${row.date}\n${cleanRoute}`,
        row.preferredTime || 'Any Time',
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['NAME', 'DATE / ROUTE', 'PREFERRED TIME']],
      body: tableBody,
      styles: {
        font: 'Times-Roman',
        fontSize: 11,
        cellPadding: 8,
        halign: 'left',
        valign: 'middle',
        lineColor: [180, 170, 150],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [201, 168, 76],
        textColor: [26, 61, 28],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'left',
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [248, 245, 240],
      },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 120 },
      },
    });
  } else {
    doc.setFont('Times-Roman', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text('No travel schedule available.', margin, cursorY + 10);
    doc.setTextColor(0, 0, 0);
    cursorY += 20;
  }

  // Get the final Y position after the table
  const autoTableResult = (doc as jsPDFType & { lastAutoTable?: { finalY: number } }).lastAutoTable;
  const finalY = autoTableResult?.finalY || cursorY;
  cursorY = finalY + 24;

  // ── Footer — emblem + address, anchored to page bottom ──────────────────
  const footerLogoW = 60;
  const footerLogoH = 45;
  const footerBlockH = 60;
  const footerY = pageHeight - footerBlockH - 10;

  // ── Signature block ──────────────────────────────────────────────────────
  const signatureDataUrl = params.signatureUrl
    ? await urlToDataUrl(params.signatureUrl)
    : null;

  const sigBlockH = (signatureDataUrl ? 48 + 8 : 14) + 20 + 10;
  let sigCursorY = footerY - sigBlockH - 14;

  if (sigCursorY < cursorY + 10) {
    sigCursorY = cursorY + 10;
  }

  // Signatory name (bold)
  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(12);
  doc.text(cleanText(params.signatoryName || ' '), margin, sigCursorY);
  sigCursorY += 8;

  // Optional signature image
  if (signatureDataUrl) {
    const sigW = 130;
    const sigH = 48;
    doc.addImage(
      signatureDataUrl,
      detectImageFormat(signatureDataUrl),
      margin,
      sigCursorY,
      sigW,
      sigH,
    );
    sigCursorY += sigH + 8;
  } else {
    sigCursorY += 14;
  }

  // FROM department line with underline (bold)
  const fromText = cleanText(params.fromDepartment || params.from);
  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(12);
  doc.text(fromText, margin, sigCursorY);
  const fromWidth = doc.getTextWidth(fromText);
  doc.setLineWidth(0.7);
  doc.line(margin, sigCursorY + 2, margin + fromWidth, sigCursorY + 2);

  // ── Separator line ────────────────────────────────────────────────────────
  doc.setLineWidth(0.7);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // ── Footer emblem (left side) ────────────────────────────────────────────
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

  // ── Footer text (right-aligned) ───────────────────────────────────────────
  doc.setFont('Times-Roman', 'normal');
  doc.setFontSize(8.5);
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
    footerY + 26,
    { align: 'right' },
  );

  // Motto in dark green + bold
  doc.setFont('Times-Roman', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(26, 61, 28);
  doc.text('Justice Be Our Shield and Defender', pageWidth - margin, footerY + 38, {
    align: 'right',
  });

  // Reset colours
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return doc.output('blob');
}