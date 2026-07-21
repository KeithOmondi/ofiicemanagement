// src/utils/generateUtilityMemoPdf.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { UtilityMemoData } from '../types/generateUtilityMemoTypes';

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

const formatAmount = (amount: number): string =>
  amount > 0
    ? amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateUtilityMemoPdf(data: UtilityMemoData): Promise<Blob> {
  const [crestDataUrl, signatureDataUrl] = await Promise.all([
    fetchImageDataUrl(data.crestUrl),
    data.signatureUrl ? fetchImageDataUrl(data.signatureUrl) : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 40;

  // Crest
  if (crestDataUrl) {
    const crestSize = 70;
    doc.addImage(crestDataUrl, 'JPEG', pageWidth / 2 - crestSize / 2, y, crestSize, crestSize);
    y += crestSize + 12;
  }

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, y, { align: 'center' });
  y += 20;
  doc.setFontSize(13);
  const title = 'INTERNAL MEMO';
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  const titleWidth = doc.getTextWidth(title);
  doc.setLineWidth(1.2);
  doc.line(pageWidth / 2 - titleWidth / 2 - 4, y + 4, pageWidth / 2 + titleWidth / 2 + 4, y + 4);
  y += 26;

  // Header fields
  doc.setFontSize(10.5);
  const headerField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}`, marginX, y);
    doc.text(':', marginX + 62, y);
    doc.text(value, marginX + 74, y);
    y += 16;
  };
  headerField('FROM', data.from.toUpperCase());
  headerField('TO', data.to.toUpperCase());
  headerField('DATE', data.date);
  headerField('SUBJECT', data.subject.toUpperCase());
  doc.setLineWidth(1);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  // Body text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const paragraphs = data.bodyText.split('\n\n').filter((p) => p.trim().length > 0);
  const usableWidth = pageWidth - marginX * 2;
  paragraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para, usableWidth);
    doc.text(lines, marginX, y);
    y += lines.length * 13 + 8;
  });
  y += 8;

  // Table
  const rows = data.rows.map((row, index) => [
    String(index + 1),
    row.judge_name,
    formatAmount(row.kplc),
    formatAmount(row.water),
    formatAmount(row.wifi),
    formatAmount(row.total),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['S/NO.', 'NAMES', 'KPLC', 'WATER', 'WIFI', 'TOTAL']],
    body: rows,
    foot: [[
      { content: 'GRAND TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatAmount(data.grandKplc), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatAmount(data.grandWater), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatAmount(data.grandWifi), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatAmount(data.grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.75 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { cellWidth: 160 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
  y = doc.lastAutoTable.finalY + 20;

  // Amount in words
  if (data.grandTotal > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Amount in Words:', marginX, y);
    doc.setFont('helvetica', 'normal');
    const wordsLines = doc.splitTextToSize(data.amountInWords.toUpperCase(), usableWidth - 110);
    doc.text(wordsLines, marginX + 110, y);
    y += wordsLines.length * 13 + 10;
  }

  // Signature block
  y += 40;
  if (y > doc.internal.pageSize.getHeight() - 150) {
    doc.addPage();
    y = 60;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(data.signatoryName, marginX, y);
  y += 8;

  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', marginX, y, 90, 34);
      y += 40;
    } catch {
      y += 10;
    }
  } else {
    y += 10;
  }

  doc.setLineWidth(0.75);
  doc.line(marginX, y, marginX + 160, y);
  y += 12;
  doc.text(data.from.toUpperCase(), marginX, y);

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 60;
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi', marginX, footerY + 12);
  doc.text('Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke', marginX, footerY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 61, 28);
  doc.text('Justice Be Our Shield and Defender', marginX, footerY + 34);

  // Return the generated PDF as a Blob instead of triggering a local
  // download via doc.save(). The caller (UtilitiesMemoModal) is
  // responsible for naming the file and deciding what to do with the
  // blob (upload to the document system and/or offer a local download).
  return doc.output('blob');
}