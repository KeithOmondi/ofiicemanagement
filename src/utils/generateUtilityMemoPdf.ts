// src/utils/generateUtilityMemoPdf.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { UtilityMemoData } from '../types/generateUtilityMemoTypes';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

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

function detectImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

const formatAmount = (amount: number): string =>
  amount > 0
    ? amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateUtilityMemoPdf(data: UtilityMemoData): Promise<Blob> {
  const [crestDataUrl, signatureDataUrl, footerEmblemDataUrl] = await Promise.all([
    fetchImageDataUrl(data.crestUrl),
    data.signatureUrl ? fetchImageDataUrl(data.signatureUrl) : Promise.resolve(null),
    fetchImageDataUrl(FOOTER_EMBLEM_SRC),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  let y = 40;

  // ── Crest ────────────────────────────────────────────────────────────────
  if (crestDataUrl) {
    const crestSize = 80; // Increased from 70
    doc.addImage(
      crestDataUrl, 
      detectImageFormat(crestDataUrl), 
      pageWidth / 2 - crestSize / 2, 
      y, 
      crestSize, 
      crestSize
    );
    y += crestSize + 16; // More spacing
  }

  // ── Title block ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14); // Increased from 13
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, y, { align: 'center' });
  y += 22; // More spacing
  doc.setFontSize(14); // Increased from 13
  const title = 'INTERNAL MEMO';
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  doc.setLineWidth(1.5); // Thicker line
  doc.line(marginX, y + 4, pageWidth - marginX, y + 4); // Full-width line
  y += 30; // More spacing

  // ── Header fields ──────────────────────────────────────────────────────
  doc.setFontSize(11); // Increased from 10.5
  const headerField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}`, marginX, y);
    doc.text(':', marginX + 68, y); // Adjusted position
    doc.text(value, marginX + 82, y); // Adjusted position
    y += 18; // More spacing
  };
  headerField('FROM', data.from.toUpperCase());
  headerField('TO', data.to.toUpperCase());
  headerField('DATE', data.date);
  headerField('SUBJECT', data.subject.toUpperCase());
  doc.setLineWidth(1.5); // Thicker line
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 22; // More spacing

  // ── Body text ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11); // Increased from 10.5
  const paragraphs = data.bodyText.split('\n\n').filter((p) => p.trim().length > 0);
  const usableWidth = pageWidth - marginX * 2;
  paragraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para, usableWidth);
    doc.text(lines, marginX, y);
    y += lines.length * 14 + 10; // More spacing
  });
  y += 12; // More spacing

  // ── Table ──────────────────────────────────────────────────────────────
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
    styles: { 
      font: 'helvetica', 
      fontSize: 10, // Increased from 9.5
      cellPadding: 6, // Increased from 5
      lineColor: [0, 0, 0], 
      lineWidth: 0.75 
    },
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0], 
      fontStyle: 'bold', 
      halign: 'left',
      fontSize: 10.5, // Added
      cellPadding: 7, // Added
    },
    footStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0],
      fontSize: 10, // Added
      cellPadding: 6, // Added
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 45 }, // Wider
      1: { cellWidth: 170 }, // Wider
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
  y = doc.lastAutoTable.finalY + 24; // More spacing

  // ── Amount in words ──────────────────────────────────────────────────
  if (data.grandTotal > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11); // Increased from 10.5
    doc.text('Amount in Words:', marginX, y);
    doc.setFont('helvetica', 'normal');
    const wordsLines = doc.splitTextToSize(data.amountInWords.toUpperCase(), usableWidth - 120);
    doc.text(wordsLines, marginX + 120, y);
    y += wordsLines.length * 14 + 12; // More spacing
  }

  // ── Footer position (computed early so the signature block can anchor to it)
  const footerY = pageHeight - 70;
  const footerLogoW = 56;
  const footerLogoH = 42;
  const footerBlockH = 58;

  // ── Signature block ──────────────────────────────────────────────────
  // Anchor the signature block a fixed distance above the footer separator,
  // but never let it creep above the content that precedes it.
  const sigBlockH = (signatureDataUrl ? 42 + 8 : 12) + 14 + 11 + 10;
  const sigGapAboveFooter = 30;
  let sigY = footerY - sigBlockH - sigGapAboveFooter;

  if (sigY < y + 20) {
    sigY = y + 20;
  }
  if (sigY > pageHeight - 220) {
    doc.addPage();
    sigY = 60;
  }
  y = sigY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11); // Increased from 10.5
  doc.text(data.signatoryName, marginX, y);
  y += 10; // More spacing

  if (signatureDataUrl) {
    try {
      const sigW = 110; // Wider from 90
      const sigH = 42; // Taller from 34
      doc.addImage(signatureDataUrl, 'PNG', marginX, y, sigW, sigH);
      y += sigH + 8;
    } catch {
      y += 12;
    }
  } else {
    y += 12;
  }

  doc.setLineWidth(1); // Thicker line
  doc.line(marginX, y, marginX + 180, y); // Longer line
  y += 14; // More spacing
  doc.setFontSize(11); // Increased from 10.5
  doc.text(data.from.toUpperCase(), marginX, y);

  // ── Footer with emblem ───────────────────────────────────────────────────
  // Separator line
  doc.setLineWidth(1);
  doc.setDrawColor(180, 180, 180);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);

  // Footer emblem (left side)
  const logoTopY = footerY + (footerBlockH - footerLogoH) / 2;
  if (footerEmblemDataUrl) {
    doc.addImage(
      footerEmblemDataUrl,
      detectImageFormat(footerEmblemDataUrl),
      marginX,
      logoTopY,
      footerLogoW,
      footerLogoH,
    );
  }

  // ── Footer text (left-aligned, vertically centered against the emblem) ───
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8); // Increased from 7.5
  doc.setTextColor(60, 60, 60);

  const footerTextX = marginX + footerLogoW + 20;
  const footerTextLineHeight = 11;
  const footerTextBlockH = footerTextLineHeight * 2; // span between 1st and 3rd baseline
  const footerTextStartY = logoTopY + (footerLogoH - footerTextBlockH) / 2 + 6;

  doc.text(
    'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
    footerTextX,
    footerTextStartY,
  );
  doc.text(
    'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
    footerTextX,
    footerTextStartY + footerTextLineHeight,
  );
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 61, 28);
  doc.setFontSize(8.5); // Slightly bigger
  doc.text(
    'Justice Be Our Shield and Defender',
    footerTextX,
    footerTextStartY + footerTextLineHeight * 2,
  );

  // Reset colours
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);

  // Return the generated PDF as a Blob
  return doc.output('blob');
}