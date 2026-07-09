// src/utils/generateAirTicketMemoPdf.ts
//
// Builds a printable PDF memo for AIR TICKET requests with a schedule table
// showing Name, Date, and Preferred Time (not DSA rates).
// Returns a Blob for upload or download.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

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

export async function generateAirTicketMemoPdf(params: AirTicketMemoParams): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  let cursorY = 40;

  // ── Crest ────────────────────────────────────────────────────────────────
  const crestDataUrl = await urlToDataUrl(params.crestUrl);
  if (crestDataUrl) {
    const crestW = 90;
    const crestH = 45;
    doc.addImage(
      crestDataUrl,
      detectImageFormat(crestDataUrl),
      (pageWidth - crestW) / 2,
      cursorY,
      crestW,
      crestH,
    );
    cursorY += crestH + 12;
  }

  // ── Title block ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 18;
  doc.text('INTERNAL MEMO', pageWidth / 2, cursorY, { align: 'center' });
  const titleWidth = doc.getTextWidth('INTERNAL MEMO');
  doc.setLineWidth(1);
  doc.line(
    pageWidth / 2 - titleWidth / 2,
    cursorY + 3,
    pageWidth / 2 + titleWidth / 2,
    cursorY + 3,
  );
  cursorY += 24;

  // ── TO / FROM / REF / DATE / SUBJECT ────────────────────────────────────
  doc.setFontSize(10);
  const labelX = margin;
  const valueX = margin + 70;

  const writeLabelLine = (label: string, value: string, withBorder = false) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, labelX, cursorY);
    doc.text(':', labelX + 60, cursorY);
    doc.text(value, valueX, cursorY);
    if (withBorder) {
      doc.setLineWidth(1);
      doc.line(margin, cursorY + 6, pageWidth - margin, cursorY + 6);
      cursorY += 10;
    }
    cursorY += 16;
  };

  writeLabelLine('TO', params.to.toUpperCase());
  writeLabelLine('FROM', params.from.toUpperCase());
  writeLabelLine('REF', params.ref);
  writeLabelLine('DATE', params.date);
  writeLabelLine('SUBJECT', params.subject.toUpperCase(), true);
  cursorY += 6;

  // ── Body ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const bodyLines = doc.splitTextToSize(params.bodyText, pageWidth - margin * 2);
  doc.text(bodyLines, margin, cursorY);
  cursorY += bodyLines.length * 13 + 10;

  // ── Schedule Table (Name, Date, Preferred Time) ────────────────────────
  if (params.scheduleRows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Name', 'Date', 'Preferred Time']],
      body: params.scheduleRows.map((row) => [
        row.name,
        `${row.date}\n${row.route}`,
        row.preferredTime,
      ]),
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], fontStyle: 'bold' },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 70 },
      },
    });
  } else {
    // No schedule rows - show a message
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('No travel schedule available.', margin, cursorY + 10);
    doc.setTextColor(0, 0, 0);
    cursorY += 20;
  }

  // ── Footer — emblem + address, anchored to page bottom ──────────────────
  const footerLogoW = 48;
  const footerLogoH = 36;
  const footerBlockH = 52;
  const footerY = pageHeight - footerBlockH - 8;

  // ── Signature block — sits just above the footer separator line ───────────
  const signatureDataUrl = params.signatureUrl
    ? await urlToDataUrl(params.signatureUrl)
    : null;

  const sigBlockH = (signatureDataUrl ? 40 + 4 : 10) + 16 + 6;
  let sigCursorY = footerY - sigBlockH - 10;

  // Signatory name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(params.signatoryName || ' ', margin, sigCursorY);
  sigCursorY += 6;

  // Optional signature image
  if (signatureDataUrl) {
    const sigW = 110;
    const sigH = 40;
    doc.addImage(
      signatureDataUrl,
      detectImageFormat(signatureDataUrl),
      margin,
      sigCursorY,
      sigW,
      sigH,
    );
    sigCursorY += sigH + 4;
  } else {
    sigCursorY += 10;
  }

  // FROM department line with underline
  const fromText = params.fromDepartment || params.from;
  doc.setFont('helvetica', 'bold');
  doc.text(fromText, margin, sigCursorY);
  const fromWidth = doc.getTextWidth(fromText);
  doc.setLineWidth(0.5);
  doc.line(margin, sigCursorY + 2, margin + fromWidth, sigCursorY + 2);

  // ── Separator line ────────────────────────────────────────────────────────
  doc.setLineWidth(0.5);
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
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
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
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 61, 28);
  doc.text('Justice Be Our Shield and Defender', pageWidth - margin, footerY + 34, {
    align: 'right',
  });

  // Reset colours
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  return doc.output('blob');
}