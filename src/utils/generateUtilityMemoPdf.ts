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
  const [crestDataUrl, signatureDataUrl, footerEmblemDataUrl] = await Promise.all([
    fetchImageDataUrl(data.crestUrl),
    data.signatureUrl ? fetchImageDataUrl(data.signatureUrl) : Promise.resolve(null),
    fetchImageDataUrl(FOOTER_EMBLEM_SRC),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  let y = 44;

  // Reserve space at the bottom of every page for the footer (divider,
  // emblem, address, tagline) so table pagination and signature placement
  // both know to stop above it instead of overlapping it.
  const footerY = pageHeight - 78;
  const footerBlockH = 70;
  const footerReserveHeight = pageHeight - footerY + footerBlockH + 12; // gap above the divider line too

  // ── Crest ────────────────────────────────────────────────────────────────
  // The crest is a wide side-by-side lockup (Kenya coat of arms + Judiciary
  // emblem with a vertical divider), not a square mark. We size it by target
  // width and derive the height from its true aspect ratio so it never gets
  // squashed or stretched.
  if (crestDataUrl) {
    const crestTargetWidth = 190;
    const crestW = crestTargetWidth;
    let crestH = crestTargetWidth * 0.5; // fallback ~2:1 if dimensions can't be read

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

  // ── Title block ──────────────────────────────────────────────────────────
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
    showFoot: 'lastPage' as const, // don't repeat the grand-total row on every page
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
    // ─── Fuel‑only table ──────────────────────────────────────────────
    const rows = data.rows.map((row, index) => [
      String(index + 1),
      row.judge_name,
      formatAmount(row.total), // total is the fuel amount
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX, bottom: footerReserveHeight },
      head: [['S/NO.', 'NAMES', 'FUEL']],
      body: rows,
      foot: [[
        { content: 'GRAND TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      ]],
      ...sharedTableStyle,
      columnStyles: {
        0: { halign: 'center', cellWidth: 45 },
        1: { cellWidth: 220 },
        2: { halign: 'right', fontStyle: 'bold' },
      },
    });
  } else {
    // ─── All‑utilities table ──────────────────────────────────────────
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
      margin: { left: marginX, right: marginX, bottom: footerReserveHeight },
      head: [['S/NO.', 'NAMES', 'KPLC', 'WATER', 'WIFI', 'TOTAL']],
      body: rows,
      foot: [[
        { content: 'GRAND TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandKplc), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandWater), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandWifi), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatAmount(data.grandTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      ]],
      ...sharedTableStyle,
      columnStyles: {
        0: { halign: 'center', cellWidth: 40 },
        1: { cellWidth: 170 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
    });
  }

  // @ts-expect-error - lastAutoTable is attached by the plugin at runtime
  y = doc.lastAutoTable.finalY + 20;

  // ── Signature block ──────────────────────────────────────────────────────
  const nameLineH = data.signatoryName ? 18 : 0;
  const sigImgH = signatureDataUrl ? 42 + 8 : 14;
  const sigBlockH = nameLineH + sigImgH + 14 + 11;

  // Sit the signature right below the table content, not pinned to the footer.
  const sigGapAboveContent = 36;
  let sigY = y + sigGapAboveContent;

  // Only push to a new page if it genuinely won't fit above the footer.
  if (sigY + sigBlockH + 20 > footerY) {
    doc.addPage();
    sigY = 60;
  }
  y = sigY;

  // Actual signatory name, bold, above the designation.
  if (data.signatoryName) {
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.text(data.signatoryName, marginX, y);
    y += nameLineH;
  }

  if (signatureDataUrl) {
    try {
      const sigW = 110;
      const sigH = 42;
      doc.addImage(signatureDataUrl, 'PNG', marginX, y, sigW, sigH);
      y += sigH + 8;
    } catch {
      y += 12;
    }
  } else {
    y += 12;
  }

  doc.setLineWidth(1);
  doc.setDrawColor(0, 0, 0);
  doc.line(marginX, y, marginX + 180, y);
  y += 15;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(data.from.toUpperCase(), marginX, y);

  // ── Footer (drawn on every page) ────────────────────────────────────────
  // Pre-compute the emblem's render size once — it's identical on every
  // page, so there's no need to re-measure it inside the loop below.
  const footerLogoW = 64; // fallback width if the emblem's natural size can't be read
  const footerLogoTargetH = 64;
  let footerRenderW = footerLogoW;
  let footerRenderH = footerLogoTargetH;

  const footerNaturalSize = footerEmblemDataUrl
    ? await getImageNaturalSize(footerEmblemDataUrl)
    : null;
  if (footerNaturalSize && footerNaturalSize.height > 0) {
    const aspectRatio = footerNaturalSize.width / footerNaturalSize.height;
    footerRenderW = footerLogoTargetH * aspectRatio;
    footerRenderH = footerLogoTargetH;
  }

  const drawPageFooter = () => {
    doc.setLineWidth(1);
    doc.setDrawColor(180, 180, 180);
    doc.line(marginX, footerY, pageWidth - marginX, footerY);

    const logoTopY = footerY + (footerBlockH - footerRenderH) / 2;
    if (footerEmblemDataUrl) {
      doc.addImage(
        footerEmblemDataUrl,
        detectImageFormat(footerEmblemDataUrl),
        marginX,
        logoTopY,
        footerRenderW,
        footerRenderH,
      );
    }

    const footerTextX = marginX + footerRenderW + 20;

    // Address + contact lines, stacked tightly.
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);

    const footerTextLineHeight = 13;
    const addressBlockH = footerTextLineHeight * 2;
    const footerTextStartY = logoTopY + (footerRenderH - addressBlockH) / 2 + 4;

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

    // Tagline: rendered noticeably larger and bolder than the address lines
    // so it reads as a standout line, matching the source styling.
    doc.setFont('times', 'bold');
    doc.setTextColor(...DARK_GREEN);
    doc.setFontSize(12.5);
    doc.text(
      'Justice Be Our Shield and Defender',
      footerTextX,
      footerTextStartY + footerTextLineHeight * 2 + 6,
    );

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
  };

  // Draw the footer once, on the final page only.
  drawPageFooter();

  return doc.output('blob');
}