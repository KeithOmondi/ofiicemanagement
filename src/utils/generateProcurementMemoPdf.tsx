// src/utils/generateProcurementMemoPdf.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

export interface ProcurementMemoData {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  itemName: string;
  quantity: number;
  unit: string;
  estimatedCost: number | null;
  urgency: string;
  justification: string;
  requestedBy: string;
  signatoryName: string;
  crestUrl?: string;         // optional crest image URL
  signatureUrl?: string;     // optional signature image URL
}

// ─── Helper: fetch image as data URL ──────────────────────────────────────

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

// ─── Main export ────────────────────────────────────────────────────────────

export const generateProcurementMemoPdf = async (data: ProcurementMemoData): Promise<Blob> => {
  // Load images
  const [crestDataUrl, signatureDataUrl, footerEmblemDataUrl] = await Promise.all([
    data.crestUrl ? fetchImageDataUrl(data.crestUrl) : Promise.resolve(null),
    data.signatureUrl ? fetchImageDataUrl(data.signatureUrl) : Promise.resolve(null),
    fetchImageDataUrl(FOOTER_EMBLEM_SRC),
  ]);

  return new Promise((resolve) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 48;
    let y = 40;

    // ── Crest ──
    if (crestDataUrl) {
      const crestSize = 70;
      doc.addImage(crestDataUrl, 'JPEG', pageWidth / 2 - crestSize / 2, y, crestSize, crestSize);
      y += crestSize + 12;
    }

    // ── Header ──
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

    // ── Memo Fields ──
    doc.setFontSize(10.5);
    const drawField = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}`, marginX, y);
      doc.text(':', marginX + 62, y);
      doc.text(value, marginX + 74, y);
      y += 16;
    };
    drawField('FROM', data.from.toUpperCase());
    drawField('TO', data.to.toUpperCase());
    drawField('DATE', data.date);
    drawField('REF', data.ref);
    drawField('SUBJECT', data.subject.toUpperCase());

    doc.setLineWidth(1);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 18;

    // ── Body ──
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

    // ── Item Details Table ──
    const total = data.estimatedCost ? data.estimatedCost * data.quantity : 0;
    const rows = [
      [
        data.itemName,
        String(data.quantity),
        data.unit,
        data.estimatedCost ? data.estimatedCost.toFixed(2) : '—',
        total ? total.toFixed(2) : '—',
      ],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['ITEM', 'QTY', 'UNIT', 'UNIT COST', 'TOTAL']],
      body: rows,
      foot: [[
        { content: 'GRAND TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: total ? total.toFixed(2) : '—', styles: { halign: 'right', fontStyle: 'bold' } },
      ]],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 5, lineColor: [0, 0, 0], lineWidth: 0.75 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'left' },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { halign: 'center', cellWidth: 60 },
        2: { halign: 'center', cellWidth: 70 },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
    });

    // @ts-expect-error - lastAutoTable is added by the plugin
    y = doc.lastAutoTable.finalY + 20;

    // ── Signature block ──
    y += 40;
    if (y > pageHeight - 150) {
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

    // ── Footer — emblem + address, anchored to page bottom ──────────────────
    const footerBlockH = 50;
    const footerY = pageHeight - footerBlockH - 24;

    // Horizontal separating line
    doc.setLineWidth(0.5);
    doc.setDrawColor(180, 180, 180);
    doc.line(marginX, footerY, pageWidth - marginX, footerY);

    // Left Emblem / Logo
    if (footerEmblemDataUrl) {
      const footerLogoW = 90;
      const footerLogoH = 26;
      doc.addImage(
        footerEmblemDataUrl,
        detectImageFormat(footerEmblemDataUrl),
        marginX,
        footerY + 8,
        footerLogoW,
        footerLogoH,
      );
    }

    // Right Block Line 1: Social Transformation Motto

    // Right Block Line 2: Physical Address
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
      pageWidth - marginX,
      footerY + 23,
      { align: 'right' },
    );

    // Right Block Line 3: Contact Details
    doc.text(
      'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
      pageWidth - marginX,
      footerY + 33,
      { align: 'right' },
    );

    // Right Block Line 4: National Anthem / Motto (Green)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(26, 61, 28);
    doc.text(
      'Justice Be Our Shield and Defender',
      pageWidth - marginX,
      footerY + 44,
      { align: 'right' },
    );

    // Reset document context defaults
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    const pdfOutput = doc.output('blob');
    resolve(pdfOutput);
  });
};