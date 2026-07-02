// src/utils/generateMemoDocx.ts
//
// Builds a real, editable .docx memo — not a screenshot/PDF — matching the
// layout of the approved ORHC memo template: centered crest, centered title
// block, plain TO/FROM/REF/DATE/SUBJECT lines, an editable body paragraph,
// a bordered DSA schedule table, amount-in-words, and a signature block.
//
// Runs entirely client-side. The crest image is fetched from wherever your
// app serves static assets (same path used by <CircuitModal />'s preview).

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';

export interface MemoDocxRow {
  judgeName: string;
  pjNumber: string;
  designation: string;
  rate: number;
  days: number;
  total: number;
  notes: string;
}

export interface MemoDocxParams {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  rows: MemoDocxRow[];
  grandTotal: number;
  amountInWords: string;
  signatoryName: string;
  crestUrl: string;
  signatureUrl?: string;
}

const TAHOMA = 'Tahoma';
const ARIAL = 'Arial';
const BLACK = '000000';

async function fetchImageBuffer(url: string): Promise<ArrayBuffer> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load image at ${url}`);
    return res.arrayBuffer();
  } catch (error) {
    console.error('Failed to fetch image:', error);
    // Return an empty buffer or a placeholder if image fails to load
    return new ArrayBuffer(0);
  }
}

/** "TO : value" style line — bold label, colon, bold value, all one paragraph. */
function labelLine(label: string, value: string, withBottomBorder = false): Paragraph {
  return new Paragraph({
    tabStops: [{ type: 'left', position: 1600 }],
    spacing: { after: 160 },
    border: withBottomBorder
      ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLACK, space: 4 } }
      : undefined,
    children: [
      new TextRun({ text: label, bold: true, font: TAHOMA, size: 24 }),
      new TextRun({ text: `\t: ${value}`, bold: true, font: TAHOMA, size: 24 }),
    ],
  });
}

function tableHeaderCell(text: string, widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { fill: 'F2F2F2' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, font: TAHOMA, size: 18 })],
      }),
    ],
  });
}

function tableBodyCell(text: string, widthPct: number, align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, font: TAHOMA, size: 18 })],
      }),
    ],
  });
}

export async function generateMemoDocx(params: MemoDocxParams): Promise<void> {
  // Fetch the crest image
  let crestBuffer = new ArrayBuffer(0);
  try {
    crestBuffer = await fetchImageBuffer(params.crestUrl);
  } catch (error) {
    console.error('Failed to fetch crest image:', error);
  }

  // Fetch the signature image if URL is provided
  let signatureBuffer = new ArrayBuffer(0);
  if (params.signatureUrl) {
    try {
      signatureBuffer = await fetchImageBuffer(params.signatureUrl);
    } catch (error) {
      console.error('Failed to fetch signature image:', error);
    }
  }

  const COL_WIDTHS = [5, 18, 12, 14, 12, 8, 12, 19]; // sums to 100

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      tableHeaderCell('#', COL_WIDTHS[0]),
      tableHeaderCell('Judge Name', COL_WIDTHS[1]),
      tableHeaderCell('PJ Number', COL_WIDTHS[2]),
      tableHeaderCell('Designation', COL_WIDTHS[3]),
      tableHeaderCell('Rate (KES)', COL_WIDTHS[4]),
      tableHeaderCell('Days', COL_WIDTHS[5]),
      tableHeaderCell('Total (KES)', COL_WIDTHS[6]),
      tableHeaderCell('Notes', COL_WIDTHS[7]),
    ],
  });

  const bodyRows =
    params.rows.length > 0
      ? params.rows.map(
          (r, i) =>
            new TableRow({
              children: [
                tableBodyCell(String(i + 1), COL_WIDTHS[0], AlignmentType.CENTER),
                tableBodyCell(r.judgeName, COL_WIDTHS[1]),
                tableBodyCell(r.pjNumber, COL_WIDTHS[2]),
                tableBodyCell(r.designation || '-', COL_WIDTHS[3]),
                tableBodyCell(r.rate.toLocaleString(), COL_WIDTHS[4], AlignmentType.RIGHT),
                tableBodyCell(String(r.days), COL_WIDTHS[5], AlignmentType.RIGHT),
                tableBodyCell(r.total.toLocaleString(), COL_WIDTHS[6], AlignmentType.RIGHT),
                //tableBodyCell(r.notes || '-', COL_WIDTHS[7]),
              ],
            })
        )
      : [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 8,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'No DSA details available.', italics: true, size: 18 })],
                  }),
                ],
              }),
            ],
          }),
        ];

  const totalRow =
    params.rows.length > 0
      ? new TableRow({
          children: [
            new TableCell({
              columnSpan: 6,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: 'GRAND TOTAL', bold: true, font: TAHOMA, size: 18 })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: params.grandTotal.toLocaleString(), bold: true, font: TAHOMA, size: 18 })],
                }),
              ],
            }),
            new TableCell({ children: [new Paragraph({ children: [] })] }),
          ],
        })
      : null;

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: totalRow ? [headerRow, ...bodyRows, totalRow] : [headerRow, ...bodyRows],
  });

  // Build the document children array
  const children: (Paragraph | Table)[] = [];

  // Crest
  if (crestBuffer.byteLength > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new ImageRun({
            data: crestBuffer,
            type: 'png',
            transformation: { width: 150, height: 75 },
          }),
        ],
      })
    );
  }

  // Title block
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'OFFICE OF THE REGISTRAR HIGH COURT', bold: true, font: ARIAL, size: 28 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: BLACK, space: 6 } },
      children: [new TextRun({ text: 'INTERNAL MEMO', bold: true, font: ARIAL, size: 28 })],
    })
  );

  // TO / FROM / REF / DATE / SUBJECT
  children.push(
    labelLine('TO', params.to),
    labelLine('FROM', params.from),
    labelLine('REF', params.ref),
    labelLine('DATE', params.date),
    new Paragraph({ spacing: { after: 300 }, children: [] }), // small gap before the bordered SUBJECT line
    labelLine('SUBJECT', params.subject, true),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [] })
  );

  // Body (user-editable in the preview, passed through as-is)
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: params.bodyText,
          font: TAHOMA,
          size: 22,
        }),
      ],
    })
  );

  // Table
  children.push(table);

  // Amount in words
  children.push(
    new Paragraph({
      spacing: { before: 240, after: 480 },
      children: [
        new TextRun({ text: 'Amount in Words: ', bold: true, font: TAHOMA, size: 22 }),
        new TextRun({ text: params.amountInWords.toUpperCase(), font: TAHOMA, size: 22 }),
      ],
    })
  );

  // Signature block - signatory name
  children.push(
    new Paragraph({
      spacing: { before: 600, after: 40 },
      children: [new TextRun({ text: params.signatoryName || ' ', bold: true, font: TAHOMA, size: 22 })],
    })
  );

  // Signature image (if available) — sits between the name and the department line
  if (signatureBuffer.byteLength > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new ImageRun({
            data: signatureBuffer,
            type: 'png',
            transformation: { width: 200, height: 80 },
          }),
        ],
      })
    );
  }

  // From line (with underline)
  children.push(
    new Paragraph({
      spacing: { before: 100, after: 40 },
      children: [
        new TextRun({
          text: params.from,
          bold: true,
          underline: {},
          font: TAHOMA,
          size: 22,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter, DXA
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${params.ref.replace(/[\\/:*?"<>|]/g, '-') || 'memo'}.docx`;
  saveAs(blob, filename);
}