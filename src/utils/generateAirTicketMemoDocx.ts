// src/utils/generateAirTicketMemoDocx.ts
//
// Builds a real, editable .docx memo for AIR TICKET requests with a schedule
// table showing Name, Date, and Preferred Time.

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

export interface AirTicketScheduleRow {
  name: string;
  date: string;
  route: string;
  preferredTime: string;
}

export interface AirTicketMemoDocxParams {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  scheduleRows: AirTicketScheduleRow[];
  signatoryName: string;
  crestUrl: string;
  signatureUrl?: string;
  fromDepartment?: string;
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
    return new ArrayBuffer(0);
  }
}

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

function tableBodyCell(
  text: string,
  widthPct: number,
  align: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT
): TableCell {
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

export async function generateAirTicketMemoDocx(params: AirTicketMemoDocxParams): Promise<Blob> {
  // Fetch images
  let crestBuffer = new ArrayBuffer(0);
  try {
    crestBuffer = await fetchImageBuffer(params.crestUrl);
  } catch (error) {
    console.error('Failed to fetch crest image:', error);
  }

  let signatureBuffer = new ArrayBuffer(0);
  if (params.signatureUrl) {
    try {
      signatureBuffer = await fetchImageBuffer(params.signatureUrl);
    } catch (error) {
      console.error('Failed to fetch signature image:', error);
    }
  }

  // 3 columns: Name, Date, Preferred Time
  const COL_WIDTHS = [30, 40, 30];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      tableHeaderCell('Name', COL_WIDTHS[0]),
      tableHeaderCell('Date', COL_WIDTHS[1]),
      tableHeaderCell('Preferred Time', COL_WIDTHS[2]),
    ],
  });

  const bodyRows = params.scheduleRows.length > 0
    ? params.scheduleRows.map((row) =>
        new TableRow({
          children: [
            tableBodyCell(row.name, COL_WIDTHS[0]),
            tableBodyCell(`${row.date}\n${row.route}`, COL_WIDTHS[1]),
            tableBodyCell(row.preferredTime, COL_WIDTHS[2]),
          ],
        })
      )
    : [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 3,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'No travel schedule available.', italics: true, size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ];

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });

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
    new Paragraph({ spacing: { after: 300 }, children: [] }),
    labelLine('SUBJECT', params.subject, true),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [] })
  );

  // Body
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

  // Signature block
  const fromText = params.fromDepartment || params.from;
  children.push(
    new Paragraph({
      spacing: { before: 600, after: 40 },
      children: [new TextRun({ text: params.signatoryName || ' ', bold: true, font: TAHOMA, size: 22 })],
    })
  );

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

  children.push(
    new Paragraph({
      spacing: { before: 100, after: 40 },
      children: [
        new TextRun({
          text: fromText,
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
            size: { width: 12240, height: 15840 },
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}