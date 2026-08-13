// src/utils/generateConferenceDocx.ts

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  Footer,
} from 'docx';
import type { ConferenceMemoParams } from './generateConferenceMemoPdf';

// ─── Helpers ────────────────────────────────────────────────────────────────

type ImageType = 'jpg' | 'png' | 'gif' | 'bmp';

async function fetchImage(url: string): Promise<{ data: Uint8Array; type: ImageType } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const mime = blob.type || '';
    let type: ImageType = 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) type = 'jpg';
    else if (mime.includes('gif')) type = 'gif';
    else if (mime.includes('bmp')) type = 'bmp';
    return { data: new Uint8Array(buffer), type };
  } catch {
    return null;
  }
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

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 2, color: '000000' },
};

function headerCell(text: string, widthPct: number, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold: true, size: 18, font: 'Times New Roman' })],
      }),
    ],
  });
}

function dataCell(text: string, widthPct: number, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT, bold = false) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold, size: 18, font: 'Times New Roman' })],
      }),
    ],
  });
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateConferenceDocx(params: ConferenceMemoParams): Promise<Blob> {
  // NOTE: the footer emblem image was removed from this generator (footer is now text-only
  // for reliability), so only the crest needs to be fetched here.
  const crest = await fetchImage(params.crestUrl);

  const children: (Paragraph | Table)[] = [];

  // ── Crest ────────────────────────────────────────────────────────────────
  if (crest) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new ImageRun({
            data: crest.data,
            type: crest.type,
            transformation: { width: 90, height: 90 },
          }),
        ],
      }),
    );
  }

  // ─── Title block ──────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'OFFICE OF THE REGISTRAR HIGH COURT',
          bold: true,
          size: 26,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 4 },
      },
      children: [
        new TextRun({
          text: 'INTERNAL MEMO',
          bold: true,
          size: 26,
          font: 'Times New Roman',
        }),
      ],
    }),
  );

  // ── Header fields ──────────────────────────────────────────────────────
  const headerField = (label: string, value: string, underline = false) =>
    new Paragraph({
      spacing: { after: 100 },
      border: underline
        ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } }
        : undefined,
      children: [
        new TextRun({ text: `${label.padEnd(9, ' ')}: `, bold: true, size: 22, font: 'Times New Roman' }),
        new TextRun({ text: value, bold: true, size: 22, font: 'Times New Roman' }),
      ],
    });

  // Subject uses the SHORT case reference (e.g. "BENCH PETITION E051 OF 2026"), not the
  // longer conferenceDescription used in the body sentence below.
  const subjectLine = `REQUEST FOR PROCUREMENT OF CONFERENCE FACILITIES -- ${params.caseReference}`;

  children.push(
    headerField('FROM', (params.fromDepartment || 'HIGH COURT SUPPORT OFFICE - ORHC').toUpperCase()),
    headerField('TO', params.to.toUpperCase()),
    headerField('REF', params.ref),
    headerField('DATE', formatDateForMemo(params.date)),
    headerField('SUBJECT', subjectLine.toUpperCase(), true),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),
  );

  // ── Body text ──────────────────────────────────────────────────────────
  const bodyParagraphs = params.bodyText
    .split('\n\n')
    .filter((p) => p.trim().length > 0)
    .map(
      (para) =>
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: para, size: 21, font: 'Times New Roman' })],
        }),
    );
  children.push(...bodyParagraphs);

  // ── Conference details ──────────────────────────────────────────────────
  if (params.conferenceDetailsText) {
    const detailsParagraphs = params.conferenceDetailsText
      .split('\n\n')
      .filter((p) => p.trim().length > 0)
      .map(
        (para) =>
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: para, size: 21, font: 'Times New Roman' })],
          }),
      );
    children.push(...detailsParagraphs);
  }

  children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));

  // ─── Closing text (MOVED ABOVE TABLE) ──────────────────────────────────
  if (params.closingText) {
    const closingParagraphs = params.closingText
      .split('\n\n')
      .filter((p) => p.trim().length > 0)
      .map(
        (para) =>
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: para, size: 21, font: 'Times New Roman' })],
          }),
      );
    children.push(...closingParagraphs);
  }

  // ────────────────────────── Conference Table ──────────────────────────
  // Build rows dynamically from entries.
  //
  // ⚠️ ConferenceMemoParams (in generateConferenceMemoPdf.ts) does not currently declare
  // an `entries` field — it has numberOfPax / facilityStartDate / facilityEndDate /
  // secretariatPax / driversAndGuardsCount instead. If `entries` isn't added to that
  // interface, this line will fail to compile with "Property 'entries' does not exist on
  // type 'ConferenceMemoParams'". Add `entries?: ConferenceEntry[]` to the interface (and
  // keep generateConferenceMemoPdf.ts's table logic in sync with this per-entry approach)
  // before shipping — otherwise the PDF and DOCX outputs will diverge.
  const entries = params.entries || [];

  if (entries.length === 0) {
    throw new Error('generateConferenceDocx: No entries provided for the table');
  }

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('S/No', 10, AlignmentType.CENTER),
      headerCell('Particulars', 45),
      headerCell('Dates', 30),
      headerCell('Pax', 15, AlignmentType.CENTER),
    ],
  });

  const dataRows = entries.map((entry, index) => {
    const dateRange = `${formatDateShort(entry.start_date)} to ${formatDateShort(entry.end_date)}`;
    return new TableRow({
      children: [
        dataCell(String(index + 1), 10, AlignmentType.CENTER),
        dataCell(entry.particulars, 45),
        dataCell(dateRange, 30),
        dataCell(String(entry.pax), 15, AlignmentType.CENTER),
      ],
    });
  });

  // Add total row if more than one entry
  if (entries.length > 1) {
    const totalPax = entries.reduce((sum, e) => sum + e.pax, 0);
    dataRows.push(
      new TableRow({
        children: [
          dataCell('', 10, AlignmentType.CENTER),
          dataCell('', 45),
          dataCell('TOTAL', 30, AlignmentType.RIGHT, true),
          dataCell(String(totalPax), 15, AlignmentType.CENTER, true),
        ],
      })
    );
  }

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  children.push(table);
  children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));

  // ─── Signature Block ────────────────────────────────────────────────────
  const signatoryName = params.fromName || 'REGISTRAR HIGH COURT';
  const signatoryTitle = params.fromTitle || 'OFFICE OF THE REGISTRAR HIGH COURT';

  children.push(
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: signatoryName,
          bold: true,
          size: 22,
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 2 },
      },
      children: [
        new TextRun({
          text: signatoryTitle,
          bold: true,
          size: 20,
          font: 'Times New Roman',
        }),
      ],
    }),
  );

  // ─── Copy to (CC) ──────────────────────────────────────────────────────
  if (params.ccList && params.ccList.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [
          new TextRun({
            text: 'Copy to:',
            bold: true,
            size: 20,
            font: 'Times New Roman',
          }),
        ],
      }),
    );
    params.ccList.forEach((cc: string, index: number) => {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `${index + 1}. ${cc}`,
              size: 20,
              font: 'Times New Roman',
            }),
          ],
        }),
      );
    });
  }

  // ─── Footer ──────────────────────────────────────────────────────────────
  const footerChildren: Paragraph[] = [];

  // Footer line
  footerChildren.push(
    new Paragraph({
      spacing: { before: 200 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'C9A84C', space: 8 },
      },
      children: [],
    }),
  );

  // Right Text Block (text-only — no emblem image in this footer)
  footerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: 'Social Transformation through Access to Justice',
          bold: true,
          size: 14,
          color: '1a3d1c',
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
          size: 12,
          color: '3d3d3d',
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
          size: 12,
          color: '3d3d3d',
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40 },
      children: [
        new TextRun({
          text: 'Justice Be Our Shield and Defender',
          bold: true,
          size: 14,
          color: '1a3d1c',
          font: 'Times New Roman',
        }),
      ],
    }),
  );

  const footer = new Footer({
    children: footerChildren,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 900, left: 900, right: 900 } },
        },
        footers: {
          default: footer,
        },
        children,
      },
    ],
  });

  // Return the blob
  return Packer.toBlob(doc);
}