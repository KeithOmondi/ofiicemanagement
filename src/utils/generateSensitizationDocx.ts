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
// Matches the PDF version: gold-filled table header/footer with dark green
// text, thin black grid lines.
const GOLD = 'C9A84C';
const DARK_GREEN = '1A3D1C';

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
  // Coerce defensively — if a caller passes a number as a string (e.g.
  // "050000"), toLocaleString() on a string ignores the formatting options
  // and returns it unchanged, leading zeros and all.
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
  /**
   * Optional extra narrative paragraph, beyond the standard sensitization
   * context paragraph, inserted before the visit/request paragraph.
   */
  additionalContext?: string;
  crestUrl?: string;
}): Promise<Blob> {
  const [crest] = await Promise.all([
    fetchImage(data.crestUrl || ''),
  ]);

  // ─── Body paragraphs ────────────────────────────────────────────────────
  // Mirrors the PDF version's order: automation notice → standard
  // sensitization context → optional extra context → visit/request → DSA
  // request line.
  const bodyParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'The Principal Registry has achieved an end-to-end automated process of its operations. Consequently, and pursuant to the Hon. Chief Registrar\'s memo on implementation of automated processing of gazette notices in succession causes, all stations are required to submit these notices through the CTS.',
          size: 21,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `The Principal Registry is committed to sensitizing the Judicial Officers and staff on the key features of the automated P&A processes to ensure efficiency in handling of cases. In this regard and following the upcoming visit of the Hon. Chief Justice to ${data.location} whose aim is to review initiatives aimed at improving access to justice, service delivery and case management.`,
          size: 21,
        }),
      ],
    }),
  ];

  if (data.additionalContext) {
    bodyParagraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: data.additionalContext, size: 21 })],
      }),
    );
  }

  bodyParagraphs.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `I request that a team from Principal Registry visits ${data.location} for sensitization from ${data.sensitizationPeriod} (travel dates ${data.travelStartDate} to ${data.travelEndDate}).`,
          size: 21,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'We request for approval and facilitation of DSA as tabulated below:',
          size: 21,
        }),
      ],
    }),
  );

  // ─── Table ──────────────────────────────────────────────────────────────
  // No DRIVER column — the driver is just another row ("Pool driver") with
  // a blank PJ/Rank, same as the real memo.
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

  // Label bold + colon, value bold + caps — no memo number field, matching
  // the actual memo (TO / FROM / DATE / SUBJECT, in that order).
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
  // One title line with a rule under it, then TO / FROM / DATE / SUBJECT,
  // with a second rule under SUBJECT before the body starts.
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
  // Only the name and designation follow the table — no closing "Approval
  // and facilitation..." line in between. Blank space for a pen signature,
  // then the signee's name and each designation line, bold, caps, and
  // underlined.
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