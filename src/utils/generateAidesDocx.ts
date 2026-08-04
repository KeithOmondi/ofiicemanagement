// src/utils/generateAidesDocx.ts
//
// Builds a real, editable .docx memo for AIDE requests (officer attachment).
// Consumes the SAME AideMemoParams shape as generateAidesMemoPdf so both
// generators are driven off one identical, fully-edited params object built
// from the on-screen editable memo preview — no separate/parallel param type.
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
import { buildToAddressLines, type AideMemoParams } from './generateAidesMemoPdf';

const RIGHT_CREST_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1784364354/ORHC_EMBLEM_wzmp94.jpg';
const FOOTER_LEFT_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

const FONT = 'Times New Roman';
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

// Word can't naturally place two images either side of centered text —
// a borderless 3-column table is the standard way to do a letterhead row.
function buildHeaderTable(leftCrest: Uint8Array | null, rightCrest: Uint8Array | null) {
  const crestCell = (img: Uint8Array | null) =>
    new TableCell({
      width: { size: 15, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: noBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: img
            ? [new ImageRun({ data: img, transformation: { width: 55, height: 55 }, type: 'jpg' })]
            : [],
        }),
      ],
    });

  const titleCell = () =>
    new TableCell({
      width: { size: 70, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: noBorder,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'THE JUDICIARY', bold: true, size: 32, font: FONT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40 },
          children: [
            new TextRun({ text: 'OFFICE OF THE REGISTRAR HIGH COURT', bold: true, size: 20, font: FONT }),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [new TableRow({ children: [crestCell(leftCrest), titleCell(), crestCell(rightCrest)] })],
  });
}

// The gold divider directly under the header title block, matching the
// Word template — this was previously missing entirely from the DOCX output.
function buildHeaderDivider(): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: 0 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 1 },
    },
    children: [],
  });
}

export async function generateAidesDocx(params: AideMemoParams): Promise<Blob> {
  const [leftCrest, rightCrest, footerLeft] = await Promise.all([
    fetchImageBuffer(params.crestUrl),
    fetchImageBuffer(RIGHT_CREST_SRC),
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

  // ── To block (no "To:" label — matches the standard) ───────────────────────
  // Only add comma if there's no organization following
  const toText = params.to + (params.toOrganization ? '' : ',');
  body.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: cleanText(toText), bold: true, size: 22, font: FONT })],
    }),
  );

  buildToAddressLines(params).forEach((line) => {
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

  // ── Subject (bold + underlined, forced uppercase to match the standard) ──
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

  // ── Officer suitability paragraph ───────────────────────────────────────
  if (params.officerSuitabilityText) {
    body.push(
      new Paragraph({
        spacing: { after: 160 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: cleanText(params.officerSuitabilityText), size: 22, font: FONT })],
      }),
    );
  }

  // ── Closing paragraph ────────────────────────────────────────────────────
  const closing =
    params.closingText ||
    'We take this opportunity to thank you for your continued partnership and kindly request your favourable consideration of this matter.';
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

  // ─── Signature Block ──────────────────────────────────────────────────────
  // Reserve space for backend signature image, name, and designation
  // The backend's embedSignatureBlockIntoPDF will add:
  //   - Signature image
  //   - Signatory name (bold)
  //   - Signatory title (underlined)
  //   - Date
  
  // Add spacing for the backend signature block
  body.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [],
    }),
  );

  // ── Department (kept for reference, appears below signature) ─────────────
  if (params.fromDepartment) {
    body.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: cleanText(params.fromDepartment), size: 20, font: FONT })],
      }),
    );
  }

  // ── Copy to (CC) - MOVED BELOW signature block ──────────────────────────
  if (params.ccList && params.ccList.length > 0) {
    body.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
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
          default: new Header({ children: [buildHeaderTable(leftCrest, rightCrest), buildHeaderDivider()] }),
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