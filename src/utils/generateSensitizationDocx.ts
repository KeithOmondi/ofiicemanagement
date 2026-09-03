// generateSensitizationDocx.ts

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

// ─── Theme ──────────────────────────────────────────────────────────────────
const GOLD = 'C9A84C';
const DARK_GREEN = '1A3D1C';

const DEFAULT_BODY_TEXT = `The Principal Registry has achieved an end-to-end automated process of its operations. Consequently, and pursuant to the Hon. Chief Registrar's memo on implementation of automated processing of gazette notices in succession causes, all stations are required to submit these notices through the CTS.

We request for approval and facilitation of DSA as tabulated below:`;

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

const formatAmount = (amount: number): string => {
  const n = Number(amount);
  return n > 0
    ? n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
};

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
    shading: { fill: GOLD },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold: true, size: 18, color: DARK_GREEN })],
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

export async function generateSensitizationDocx(data: {
  date: string;
  from: string;
  to: string;
  subject: string;
  location: string;
  travelStartDate: string;
  travelEndDate: string;
  sensitizationPeriod: string;
  /** The user-edited body copy (as typed in the memo preview's "Edit Memo" textarea). */
  bodyText?: string;
  teamMembers: Array<{
    s_no: number;
    name: string;
    pjNumber: string;
    rank: string;
    days: number;
    dsaRate: number;
    total: number;
    isDriver?: boolean;
  }>;
  grandTotal: number;
  preparedBy: string;
  /** e.g. "DEPUTY REGISTRAR\nPRINCIPAL REGISTRY." — one designation line per newline */
  title: string;
  crestUrl?: string;
}): Promise<Blob> {
  const [crest] = await Promise.all([
    fetchImage(data.crestUrl || ''),
  ]);

  // ─── Body paragraphs ────────────────────────────────────────────────────
  // Renders whatever the user typed/edited in the memo preview, split on
  // blank lines so their paragraph breaks are preserved. Falls back to the
  // standard sensitization copy if bodyText wasn't supplied.
  const bodySource = (data.bodyText && data.bodyText.trim().length > 0)
    ? data.bodyText
    : DEFAULT_BODY_TEXT;

  const bodyParagraphs: Paragraph[] = bodySource
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: paragraph, size: 21 })],
        }),
    );

  // ─── Table ──────────────────────────────────────────────────────────────
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('NO.', 6, AlignmentType.CENTER),
      headerCell('Name', 25),
      headerCell('PJ', 12, AlignmentType.CENTER),
      headerCell('Rank', 13),
      headerCell('No. of Days', 12, AlignmentType.CENTER),
      headerCell('DSA Rate', 14, AlignmentType.RIGHT),
      headerCell('Total', 16, AlignmentType.RIGHT),
    ],
  });

  const dataRows = data.teamMembers.map(
    (member) =>
      new TableRow({
        children: [
          dataCell(String(member.s_no), 6, AlignmentType.CENTER),
          dataCell(member.name, 25),
          dataCell(member.pjNumber, 12, AlignmentType.CENTER),
          dataCell(member.rank, 13),
          dataCell(String(member.days), 12, AlignmentType.CENTER),
          dataCell(formatAmount(member.dsaRate), 14, AlignmentType.RIGHT),
          dataCell(formatAmount(member.total), 16, AlignmentType.RIGHT, true),
        ],
      }),
  );

  const totalRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 84, type: WidthType.PERCENTAGE },
        columnSpan: 6,
        borders: cellBorders,
        shading: { fill: GOLD },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'TOTAL', bold: true, size: 20, color: DARK_GREEN })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 16, type: WidthType.PERCENTAGE },
        borders: cellBorders,
        shading: { fill: GOLD },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: formatAmount(data.grandTotal), bold: true, size: 20, color: DARK_GREEN })],
          }),
        ],
      }),
    ],
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  });

  const headerField = (label: string, value: string, ruleBelow = false) =>
    new Paragraph({
      spacing: { after: 100 },
      border: ruleBelow
        ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 8 } }
        : undefined,
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }),
        new TextRun({ text: value.toUpperCase(), bold: true, size: 22 }),
      ],
    });

  const children: (Paragraph | Table)[] = [];

  // ─── Crest ──────────────────────────────────────────────────────────────
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

  // ─── Header ─────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 8 } },
      children: [new TextRun({ text: 'OFFICE OF THE REGISTRAR HIGH COURT', bold: true, size: 26 })],
    }),
    headerField('TO', data.to),
    headerField('FROM', data.from),
    headerField('DATE', data.date),
    headerField('SUBJECT', data.subject, true),
    new Paragraph({ spacing: { before: 100, after: 100 }, children: [] }),
    ...bodyParagraphs,
    table,
  );

  // ─── Signature block ─────────────────────────────────────────────────────
  children.push(
    new Paragraph({ spacing: { before: 500 }, children: [] }),
    new Paragraph({
      spacing: { after: 40 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 2 } },
      children: [new TextRun({ text: data.preparedBy.toUpperCase(), bold: true, size: 22 })],
    }),
    ...data.title
      .split('\n')
      .filter(Boolean)
      .map(
        (line) =>
          new Paragraph({
            spacing: { after: 40 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 2 } },
            children: [new TextRun({ text: line.toUpperCase(), bold: true, size: 21 })],
          }),
      ),
  );

  // ─── Footer ────────────────────────────────────────────────────────────────
  children.push(
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
      children: [new TextRun({ text: 'Justice Be Our Shield and Defender', bold: true, color: DARK_GREEN, size: 14 })],
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

  return Packer.toBlob(doc);
}