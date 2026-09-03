//generateUtilityMemoPdf.ts


import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { UtilityMemoData } from '../types/generateUtilityMemoTypes';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';

// ─── Theme ──────────────────────────────────────────────────────────────────
// Matches the app's judiciary gold / dark-green design system.
const GOLD: [number, number, number] = [201, 168, 76]; // #c9a84c
const DARK_GREEN: [number, number, number] = [26, 61, 28]; // #1a3d1c
const GRID_GREY: [number, number, number] = [170, 170, 170];

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

// Returns the intrinsic pixel dimensions of an image from its data URL,
// so we can size it in the PDF without distorting its aspect ratio.
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

const formatAmount = (amount: number): string =>
  amount > 0
    ? amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateUtilityMemoPdf(data: UtilityMemoData): Promise<Blob> {
  // ─── NOTE: The signature block is intentionally NOT handled here ────────
  // The two-step approval workflow stamps the real signature onto the PDF
  // via embedSignatureIntoPDF on the backend. This generator only creates
  // the memo content with a placeholder space where the signature will go.
  
  const [crestDataUrl, footerEmblemDataUrl] = await Promise.all([
    fetchImageDataUrl(data.crestUrl),
    fetchImageDataUrl(FOOTER_EMBLEM_SRC),
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
  // ✅ Keep the crest logo
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
  // ✅ "OFFICE OF THE REGISTRAR HIGH COURT" above "INTERNAL MEMO"
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
    doc.text(value, marginX + 84, y);
    y += 18;
  };
  doc.setFont('times', 'bold');
  headerField('FROM', data.from.toUpperCase());
  headerField('TO', data.to.toUpperCase());
  headerField('DATE', data.date);
  headerField('SUBJECT', data.subject.toUpperCase());
  doc.setLineWidth(1.25);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 22;

  // ── Body text ──────────────────────────────────────────────────────────
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const paragraphs = data.bodyText.split('\n\n').filter((p) => p.trim().length > 0);
  const usableWidth = pageWidth - marginX * 2;
  paragraphs.forEach((para) => {
    const lines = doc.splitTextToSize(para, usableWidth);
    doc.text(lines, marginX, y);
    y += lines.length * 14.5 + 10;
  });
  y += 8;

  // ────────────────────────── Table ──────────────────────────────────────
  const isFuel = data.memoType === 'fuel';

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
    footStyles: {
      fillColor: [247, 244, 235] as [number, number, number],
      textColor: DARK_GREEN,
      fontSize: 10,
      cellPadding: 7,
      lineColor: GRID_GREY,
      lineWidth: 0.6,
    },
    alternateRowStyles: {
      fillColor: [250, 249, 246] as [number, number, number],
    },
  };

  if (isFuel) {
    // ─── Fuel‑only table with PJ Number ──────────────────────────────────
    const rows = data.rows.map((row, index) => [
      String(index + 1),
      row.judge_name,
      row.pj_number || '',  // ← ADD PJ NUMBER
      formatAmount(row.total),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX, bottom: footerReserveHeight },
      head: [['S/NO.', 'NAMES', 'PJ NO.', 'FUEL']],
      body: rows,
      foot: [[
        { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      ]],
      ...sharedTableStyle,
      columnStyles: {
        0: { halign: 'center', cellWidth: 40 },
        1: { cellWidth: 170 },
        2: { cellWidth: 80, halign: 'center' },  // PJ Number column
        3: { halign: 'right', fontStyle: 'bold' },
      },
    });
  } else {
    // ─── All‑utilities table with PJ Number ──────────────────────────────
    const rows = data.rows.map((row, index) => [
      String(index + 1),
      row.judge_name,
      row.pj_number || '',  // ← ADD PJ NUMBER
      formatAmount(row.kplc),
      formatAmount(row.water),
      formatAmount(row.wifi),
      formatAmount(row.total),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX, bottom: footerReserveHeight },
      head: [['S/NO.', 'NAMES', 'PJ NO.', 'KPLC', 'WATER', 'WIFI', 'TOTAL']],
      body: rows,
      foot: [[
        { content: 'GRAND TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandKplc), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandWater), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandWifi), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      ]],
      ...sharedTableStyle,
      columnStyles: {
        0: { halign: 'center', cellWidth: 35 },
        1: { cellWidth: 150 },
        2: { cellWidth: 70, halign: 'center' },  // PJ Number column
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
  y = doc.lastAutoTable.finalY + 20;

  // ─── Signature Block Placeholder ────────────────────────────────────────
  // This space is reserved for the backend to embed the actual signature.
  // The backend uses embedSignatureBlockIntoPDF to add the signature image,
  // signatory name, designation, and date.
  
  const RESERVED_SIGNATURE_SPACE = 60; // pt — space for backend signature
  const sigGapAboveContent = 36;
  let sigY = y + sigGapAboveContent;

  // Only push to a new page if it won't fit above the footer reserve height
  if (sigY + RESERVED_SIGNATURE_SPACE + 40 > footerY) {
    doc.addPage();
    sigY = 60;
  }
  y = sigY;

  // Reserve space for the backend signature block
  // The backend will embed: signature image → signatory name → designation → date
  y += RESERVED_SIGNATURE_SPACE;

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
    // Gold Divider Line
    doc.setLineWidth(1);
    doc.setDrawColor(...GOLD);
    doc.line(marginX, footerY, pageWidth - marginX, footerY);

    const logoTopY = footerY + 12;

    // Left Emblem
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

    // Right Text Block
    const rightMargin = pageWidth - marginX;
    let textY = footerY + 16;

    // Top Tagline (Dark Green, Bold)
    // Address Line
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

    // Contact Line
    textY += 11.5;
    doc.text(
      'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
      rightMargin,
      textY,
      { align: 'right' }
    );

    // Bottom Tagline (Dark Green, Bold)
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