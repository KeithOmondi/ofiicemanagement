// src/utils/generateSentryMemoDocx.ts
//
// Builds a real, editable .docx memo for SENTRY (Residence Security) requests.
// Consumes the SAME SentryMemoParams shape as generateSentryMemoPdf so both
// generators are driven off one identical, fully-edited params object.
// Returns a Blob for upload or download.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  VerticalAlign,
  AlignmentType,
  UnderlineType,
} from 'docx';
import { buildSentryToAddressLines, type SentryMemoParams } from './generateSentryMemoPdf';

const FOOTER_LEFT_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

const FONT = 'Times New Roman';
// Header title lines use Arial to match the PDF generator's header treatment
// (jsPDF substitutes Helvetica for Arial; Word can render Arial directly).
const HEADER_FONT = 'Arial';
const GOLD = 'C9A84C';

async function fetchImageBuffer(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch (error) {
    console.error('Failed to fetch image for docx:', url, error);
    return null;
  }
}

function cleanText(text: string): string {
  return text
    .replace(/→/g, '->')
    .replace(/[–—]/g, '-')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function formatDate(dateStr: string): string {
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

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

// Header with logo on left and title text next to it (2-column layout)
function buildHeaderTable(leftCrest: Uint8Array | null) {
  const crestCell = () =>
    new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: noBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: leftCrest
            ? [new ImageRun({ data: leftCrest, transformation: { width: 55, height: 55 }, type: 'jpg' })]
            : [],
        }),
      ],
    });

  const titleCell = () =>
    new TableCell({
      width: { size: 85, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: noBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          // docx `size` is in half-points, so 15pt = 30 and 12pt = 24 below.
          children: [new TextRun({ text: 'THE JUDICIARY', bold: true, size: 30, font: HEADER_FONT })],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 20 },
          children: [
            new TextRun({ text: 'OFFICE OF THE REGISTRAR HIGH COURT', bold: true, size: 24, font: HEADER_FONT }),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [new TableRow({ children: [crestCell(), titleCell()] })],
  });
}

// The gold divider directly under the header title block
function buildHeaderDivider(): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 0 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 1 },
    },
    children: [],
  });
}

export async function generateSentryMemoDocx(params: SentryMemoParams): Promise<Blob> {
  const [leftCrest, sigImg, footerLeft] = await Promise.all([
    fetchImageBuffer(params.crestUrl),
    params.signatureUrl ? fetchImageBuffer(params.signatureUrl) : Promise.resolve(null),
    fetchImageBuffer(FOOTER_LEFT_EMBLEM_SRC),
  ]);

  const body: Paragraph[] = [];

  // ── Ref / Date ────────────────────────────────────────────────────────────
  body.push(
    new Paragraph({
      spacing: { before: 240, after: 200 },
      tabStops: [{ type: 'right' as const, position: 9350 }],
      children: [
        new TextRun({ text: `Ref: ${params.ref}`, bold: true, size: 22, font: FONT }),
        new TextRun({ text: '\t', font: FONT }),
        new TextRun({ text: formatDate(params.date), bold: true, size: 22, font: FONT }),
      ],
    }),
  );

  // ── To block ──────────────────────────────────────────────────────────────
  body.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: cleanText(params.to), bold: true, size: 22, font: FONT })],
    }),
  );

  buildSentryToAddressLines(params).forEach((line) => {
    body.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: cleanText(line), size: 22, font: FONT })],
      }),
    );
  });

  if (params.toCity) {
    body.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: cleanText(params.toCity), bold: true, size: 22, font: FONT })],
      }),
    );
  }

  // ── Subject (bold + underlined, forced uppercase) ──────────────────────
  body.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `RE: ${cleanText(params.subject).toUpperCase()}`,
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          size: 22,
          font: FONT,
        }),
      ],
    }),
  );

  // ── Greeting ─────────────────────────────────────────────────────────────
  const greeting = params.greetingText || 'Greetings from the Office of the Registrar, High Court.';
  body.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: cleanText(greeting), size: 22, font: FONT })],
    }),
  );

  // ── Main body paragraph(s) ──────────────────────────────────────────────
  cleanText(params.bodyText)
    .split('\n\n')
    .filter((p) => p.trim())
    .forEach((para) => {
      body.push(
        new Paragraph({
          spacing: { after: 160 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: para.trim(), size: 22, font: FONT })],
        }),
      );
    });

  // ── Closing paragraph ────────────────────────────────────────────────────
  const closing = params.closingText ||
    'We take this opportunity to express our sincere appreciation for the continued support and partnership extended by the Administration Police Service. We kindly request your favourable consideration of this request.';
  body.push(
    new Paragraph({
      spacing: { after: 320 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: cleanText(closing), size: 22, font: FONT })],
    }),
  );

  // ── Yours sincerely ──────────────────────────────────────────────────────
  body.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Yours sincerely,', bold: true, size: 22, font: FONT })],
    }),
  );

  // ── Signature image (optional) ──────────────────────────────────────────
  if (sigImg) {
    body.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new ImageRun({ data: sigImg, transformation: { width: 110, height: 40 }, type: 'png' })],
      }),
    );
  } else {
    body.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  // ── Signatory name / title (title bold + underlined) ────────────────────
  body.push(
    new Paragraph({
      spacing: { after: 20 },
      children: [new TextRun({ text: cleanText(params.signatoryName), bold: true, size: 22, font: FONT })],
    }),
  );
  body.push(
    new Paragraph({
      spacing: { after: params.fromDepartment ? 20 : 200 },
      children: [
        new TextRun({
          text: cleanText(params.signatoryTitle),
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          size: 22,
          font: FONT,
        }),
      ],
    }),
  );
  if (params.fromDepartment) {
    body.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: cleanText(params.fromDepartment), size: 20, font: FONT })],
      }),
    );
  }

  // ── Initials ──────────────────────────────────────────────────────────────
  if (params.initials) {
    body.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: cleanText(params.initials), size: 20, font: FONT })],
      }),
    );
  }

  // ── Copy to (CC) ──────────────────────────────────────────────────────────
  if (params.ccList && params.ccList.length > 0) {
    body.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: 'Copy to:', bold: true, size: 20, font: FONT })],
      }),
    );
    params.ccList.forEach((cc, index) => {
      body.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `${index + 1}. ${cc}`, size: 20, font: FONT })],
        }),
      );
    });
  }

  // ── Document assembly ────────────────────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 900, left: 900, right: 900 } },
        },
        headers: {
          default: new Header({ children: [buildHeaderTable(leftCrest), buildHeaderDivider()] }),
        },
        footers: {
          default: new Footer({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { ...noBorder, top: { style: BorderStyle.SINGLE, size: 4, color: 'B4B4B4' } },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        borders: noBorder,
                        children: [
                          new Paragraph({
                            children: footerLeft
                              ? [new ImageRun({ data: footerLeft, transformation: { width: 34, height: 26 }, type: 'jpg' })]
                              : [],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 85, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        borders: noBorder,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({
                                text: 'Social Transformation through Access to Justice',
                                italics: true,
                                size: 14,
                                color: '555555',
                                font: FONT,
                              }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({
                                text: 'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
                                size: 14,
                                color: '555555',
                                font: FONT,
                              }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            spacing: { after: 40 },
                            children: [
                              new TextRun({
                                text: 'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
                                size: 14,
                                color: '555555',
                                font: FONT,
                              }),
                            ],
                          }),
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({
                                text: 'Justice Be Our Shield and Defender',
                                bold: true,
                                size: 15,
                                color: '1A3D1C',
                                font: FONT,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });

  return Packer.toBlob(doc);
}