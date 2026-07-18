// src/utils/generateGRMemoDocx.ts
//
// Builds an editable Word (.docx) letter for GENERAL REQUEST (GR) memos —
// Driver/Bodyguard/Firearm/Station/Force Number/Residence Security/Sentry
// requests to the Kenya Police Service or Administration Police Service.
//
// Mirrors the layout of generateGRMemoPdf.ts (crest → title block → Ref/Date
// → address block → RE: subject → body → signatory → Copy to: → footer),
// which itself follows the standard letter format — as opposed to the boxed
// "INTERNAL MEMO" format used for medical claims (see generateMemoDocx.ts).
// Returns a Blob for upload or download.

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  BorderStyle,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
} from 'docx';
import type { GRMemoParams } from './generateGRMemoPdf';

const FOOTER_EMBLEM_SRC =
  'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

export interface GRMemoCopyToEntry {
  label: string;
  value: string;
}

export interface GRMemoDocxParams {
  to: string;               // full address block, newline-separated
  from: string;              // e.g. "OFFICE OF THE REGISTRAR, HIGH COURT"
  ref: string;                // e.g. "RHC/10 8th July 2026"
  date: string;
  subject: string;           // rendered after "RE: ", uppercased
  bodyText: string;
  copyTo: GRMemoCopyToEntry[];
  signatoryName: string;
  crestUrl: string;
  signatureUrl?: string;
  fromDepartment?: string;   // defaults to `from` if omitted
}

const DARK_GREEN = '1A3D1C';
const GREY = '505050';

async function urlToArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (error) {
    console.error('Failed to load image for DOCX:', url, error);
    return null;
  }
}

export async function generateGRMemoDocx(params: GRMemoParams): Promise<Blob> {
  const crestBuffer = await urlToArrayBuffer(params.crestUrl);
  const signatureBuffer = params.signatureUrl
    ? await urlToArrayBuffer(params.signatureUrl)
    : null;
  const footerEmblemBuffer = await urlToArrayBuffer(FOOTER_EMBLEM_SRC);

  const children: Paragraph[] = [];

  // ── Crest ────────────────────────────────────────────────────────────────
  if (crestBuffer) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new ImageRun({
            data: crestBuffer,
            transformation: { width: 130, height: 65 },
            type: 'png',
          }),
        ],
      }),
    );
  }

  // ── Title block ──────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'THE JUDICIARY', bold: true, size: 22 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: 'OFFICE OF THE REGISTRAR HIGH COURT',
          bold: true,
          size: 26,
        }),
      ],
    }),
  );

  // ── Ref / Date line (two-column table so they sit on one line, L/R aligned) ──
  children.push(
    new Paragraph({
      tabStops: [{ type: 'right' as const, position: 9026 }],
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `Ref: ${params.ref}`, bold: true, size: 20 }),
        new TextRun({ text: `\t${params.date}`, bold: true, size: 20 }),
      ],
    }),
  );

  // ── Address block (TO) ───────────────────────────────────────────────────
  params.to.split('\n').forEach((line) => {
    children.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: line, size: 20 })],
      }),
    );
  });
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // ── RE: subject (bold, underlined) ──────────────────────────────────────
  children.push(
    new Paragraph({
      spacing: { after: 260 },
      children: [
        new TextRun({
          text: `RE: ${params.subject.toUpperCase()}`,
          bold: true,
          underline: {},
          size: 20,
        }),
      ],
    }),
  );

  // ── Body ─────────────────────────────────────────────────────────────────
  const paragraphs = params.bodyText.split(/\n\s*\n/);
  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: para.trim(), size: 20 })],
      }),
    );
  }

  // ── Signature block ──────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 240 },
      children: [new TextRun({ text: 'Yours sincerely,', bold: true, size: 20 })],
    }),
  );

  if (signatureBuffer) {
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new ImageRun({
            data: signatureBuffer,
            transformation: { width: 130, height: 47 },
            type: 'png',
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({ text: params.signatoryName || ' ', bold: true, size: 20 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: (params.fromDepartment || params.from).toUpperCase(),
          bold: true,
          underline: {},
          size: 20,
        }),
      ],
    }),
  );

  // ── Copy to: list ────────────────────────────────────────────────────────
  if (params.copyTo.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: 'Copy to:', bold: true, size: 20 })],
      }),
    );
    for (const entry of params.copyTo) {
      children.push(
        new Paragraph({
          indent: { left: 260 },
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${entry.label} ${entry.value}`, size: 20 }),
          ],
        }),
      );
    }
  }

  // ── Footer — emblem + address, single-row table for side-by-side layout ──
  const footerRowCells: TableCell[] = [];

  footerRowCells.push(
    new TableCell({
      width: { size: 20, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      children: footerEmblemBuffer
        ? [
            new Paragraph({
              children: [
                new ImageRun({
                  data: footerEmblemBuffer,
                  transformation: { width: 48, height: 36 },
                  type: 'png',
                }),
              ],
            }),
          ]
        : [new Paragraph({ children: [] })],
    }),
  );

  footerRowCells.push(
    new TableCell({
      width: { size: 80, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: 'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
              size: 14,
              color: GREY,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: 'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
              size: 14,
              color: GREY,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: 'Justice Be Our Shield and Defender',
              size: 15,
              bold: true,
              color: DARK_GREEN,
            }),
          ],
        }),
      ],
    }),
  );

  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'B4B4B4' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [new TableRow({ children: footerRowCells })],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 900, right: 900 },
          },
        },
        children,
        footers: {
          default: new Footer({
            children: [footerTable],
          }),
        },
      },
    ],
  });

  return Packer.toBlob(doc);
}