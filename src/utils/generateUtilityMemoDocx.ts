// src/utils/generateUtilityMemoDocx.ts
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
} from 'docx';
import type { UtilityMemoData } from '../types/generateUtilityMemoTypes';

// ─── Helpers ────────────────────────────────────────────────────────────────

type ImageType = 'jpg' | 'png' | 'gif' | 'bmp';

async function fetchImage(url: string): Promise<{ data: Uint8Array; type: ImageType } | null> {
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

const formatAmount = (amount: number): string =>
  amount > 0
    ? amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

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
        children: [new TextRun({ text, bold: true, size: 18 })],
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
        children: [new TextRun({ text, bold, size: 20 })],
      }),
    ],
  });
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function generateUtilityMemoDocx(data: UtilityMemoData): Promise<Blob> {
  const [crest, signature] = await Promise.all([
    fetchImage(data.crestUrl),
    data.signatureUrl ? fetchImage(data.signatureUrl) : Promise.resolve(null),
  ]);

  const bodyParagraphs = data.bodyText
    .split('\n\n')
    .filter((p) => p.trim().length > 0)
    .map(
      (para) =>
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: para, size: 21 })],
        }),
    );

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('S/NO.', 8, AlignmentType.CENTER),
      headerCell('NAMES', 32),
      headerCell('KPLC', 15, AlignmentType.RIGHT),
      headerCell('WATER', 15, AlignmentType.RIGHT),
      headerCell('WIFI', 15, AlignmentType.RIGHT),
      headerCell('TOTAL', 15, AlignmentType.RIGHT),
    ],
  });

  const dataRows = data.rows.map(
    (row, index) =>
      new TableRow({
        children: [
          dataCell(String(index + 1), 8, AlignmentType.CENTER),
          dataCell(row.judge_name, 32),
          dataCell(formatAmount(row.kplc), 15, AlignmentType.RIGHT),
          dataCell(formatAmount(row.water), 15, AlignmentType.RIGHT),
          dataCell(formatAmount(row.wifi), 15, AlignmentType.RIGHT),
          dataCell(formatAmount(row.total), 15, AlignmentType.RIGHT, true),
        ],
      }),
  );

  const totalRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        columnSpan: 2,
        borders: cellBorders,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'GRAND TOTAL', bold: true, size: 20 })],
          }),
        ],
      }),
      dataCell(formatAmount(data.grandKplc), 15, AlignmentType.RIGHT, true),
      dataCell(formatAmount(data.grandWater), 15, AlignmentType.RIGHT, true),
      dataCell(formatAmount(data.grandWifi), 15, AlignmentType.RIGHT, true),
      dataCell(formatAmount(data.grandTotal), 15, AlignmentType.RIGHT, true),
    ],
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  });

  const headerField = (label: string, value: string, underline = false) =>
    new Paragraph({
      spacing: { after: 100 },
      border: underline
        ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 4 } }
        : undefined,
      children: [
        new TextRun({ text: `${label.padEnd(9, ' ')}: `, bold: true, size: 22 }),
        new TextRun({ text: value, bold: true, size: 22 }),
      ],
    });

  const children: (Paragraph | Table)[] = [];

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

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'OFFICE OF THE REGISTRAR HIGH COURT', bold: true, size: 26 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 4 } },
      children: [new TextRun({ text: 'INTERNAL MEMO', bold: true, size: 26 })],
    }),
    headerField('FROM', data.from.toUpperCase()),
    headerField('TO', data.to.toUpperCase()),
    headerField('DATE', data.date),
    headerField('SUBJECT', data.subject.toUpperCase(), true),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),
    ...bodyParagraphs,
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    table,
  );

  if (data.grandTotal > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({ text: 'Amount in Words: ', bold: true, size: 21 }),
          new TextRun({ text: data.amountInWords.toUpperCase(), size: 21 }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: data.signatoryName, bold: true, size: 22 })] }),
  );

  if (signature) {
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new ImageRun({
            data: signature.data,
            type: signature.type,
            transformation: { width: 120, height: 45 },
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 2 } },
      children: [new TextRun({ text: data.from.toUpperCase(), bold: true, underline: {}, size: 22 })],
    }),
    new Paragraph({
      spacing: { before: 600 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 8 } },
      children: [
        new TextRun({
          text: 'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
          size: 14,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
          size: 14,
        }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Justice Be Our Shield and Defender', bold: true, color: '1a3d1c', size: 14 })],
    }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Return the generated Word document as a Blob instead of triggering a
  // local download via saveAs(). The caller (UtilitiesMemoModal) is
  // responsible for naming the file and deciding what to do with the
  // blob (upload to the document system and/or offer a local download).
  return Packer.toBlob(doc);
}