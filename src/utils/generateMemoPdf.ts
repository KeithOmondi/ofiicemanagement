// src/utils/generateMemoPdf.ts
//
// Builds a printable PDF memo mirroring the .docx layout: crest, title
// block, TO/FROM/REF/DATE/SUBJECT lines, an editable body paragraph, a DSA
// schedule table, amount-in-words, and a signature block.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface MemoPdfRow {
  judgeName: string;
  pjNumber: string;
  designation: string;
  rate: number;
  days: number;
  total: number;
  notes: string;
}

export interface MemoPdfParams {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  rows: MemoPdfRow[];
  grandTotal: number;
  amountInWords: string;
  signatoryName: string;
  crestUrl: string;
  signatureUrl?: string;
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

export async function generateMemoPdf(params: MemoPdfParams): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 54; // ~0.75in
  let cursorY = 40;

  // Crest
  const crestDataUrl = await urlToDataUrl(params.crestUrl);
  if (crestDataUrl) {
    const crestW = 90;
    const crestH = 45;
    doc.addImage(crestDataUrl, detectImageFormat(crestDataUrl), (pageWidth - crestW) / 2, cursorY, crestW, crestH);
    cursorY += crestH + 12;
  }

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 18;
  doc.text('INTERNAL MEMO', pageWidth / 2, cursorY, { align: 'center' });
  const titleWidth = doc.getTextWidth('INTERNAL MEMO');
  doc.setLineWidth(1);
  doc.line(pageWidth / 2 - titleWidth / 2, cursorY + 3, pageWidth / 2 + titleWidth / 2, cursorY + 3);
  cursorY += 24;

  // TO / FROM / REF / DATE / SUBJECT
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

  writeLabelLine('TO', params.to);
  writeLabelLine('FROM', params.from);
  writeLabelLine('REF', params.ref);
  writeLabelLine('DATE', params.date);
  writeLabelLine('SUBJECT', params.subject, true);
  cursorY += 6;

  // Body (user-editable in the preview)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const bodyLines = doc.splitTextToSize(params.bodyText, pageWidth - margin * 2);
  doc.text(bodyLines, margin, cursorY);
  cursorY += bodyLines.length * 13 + 10;

  // Table
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['#', 'Judge Name', 'PJ Number', 'Designation', 'Rate (KES)', 'Days', 'Total (KES)', 'Notes']],
    body:
      params.rows.length > 0
        ? params.rows.map((r, i) => [
            String(i + 1),
            r.judgeName,
            r.pjNumber,
            r.designation || '-',
            r.rate.toLocaleString(),
            String(r.days),
            r.total.toLocaleString(),
            r.notes || '-',
          ])
        : [['—', 'No DSA details available.', '', '', '', '', '', '']],
    foot:
      params.rows.length > 0
        ? [['', '', '', '', '', 'GRAND TOTAL', params.grandTotal.toLocaleString(), '']]
        : undefined,
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], fontStyle: 'bold' },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    theme: 'grid',
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Amount in words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Amount in Words: ', margin, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.text(params.amountInWords.toUpperCase(), margin + 95, cursorY);
  cursorY += 40;

  // Signature block — name, then signature image, then department line
  doc.setFont('helvetica', 'bold');
  doc.text(params.signatoryName || ' ', margin, cursorY);
  cursorY += 6;

  const signatureDataUrl = params.signatureUrl ? await urlToDataUrl(params.signatureUrl) : null;
  if (signatureDataUrl) {
    const sigW = 110;
    const sigH = 40;
    doc.addImage(signatureDataUrl, detectImageFormat(signatureDataUrl), margin, cursorY, sigW, sigH);
    cursorY += sigH + 4;
  } else {
    cursorY += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(params.from, margin, cursorY);
  const fromWidth = doc.getTextWidth(params.from);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY + 2, margin + fromWidth, cursorY + 2);

  const filename = `${(params.ref || 'memo').replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
  doc.save(filename);
}