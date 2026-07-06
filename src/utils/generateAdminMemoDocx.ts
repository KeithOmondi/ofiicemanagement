// src/utils/generateAdminMemoDocx.ts

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  BorderStyle,
} from 'docx';
import type { AdminMemoData } from '../components/templates/SuperAdminMemo';

type DocxChild = Paragraph | ImageRun;

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
      ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 4 } }
      : undefined,
    children: [
      new TextRun({ text: label, bold: true, font: 'Tahoma', size: 24 }),
      new TextRun({ text: `\t: ${value}`, bold: true, font: 'Tahoma', size: 24 }),
    ],
  });
}

export async function generateAdminMemoDocx(data: AdminMemoData): Promise<Blob> {
  const crestBuffer = await fetchImageBuffer(data.crestUrl);
  const footerBuffer = await fetchImageBuffer(data.footerEmblemUrl);
  const signatureBuffer = data.signatureUrl ? await fetchImageBuffer(data.signatureUrl) : new ArrayBuffer(0);

  // Build the document children array
  const children: DocxChild[] = [];

  // ─── Crest ───────────────────────────────────────────────────────────────
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

  // ─── Title block ──────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'OFFICE OF THE REGISTRAR HIGH COURT', bold: true, font: 'Arial', size: 28 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: '000000', space: 6 } },
      children: [new TextRun({ text: 'INTERNAL MEMO', bold: true, font: 'Arial', size: 28 })],
    })
  );

  // ─── Fields ───────────────────────────────────────────────────────────────
  children.push(
    labelLine('TO', data.to.toUpperCase()),
    labelLine('FROM', data.from.toUpperCase())
  );

  if (data.cc) {
    children.push(labelLine('CC', data.cc.toUpperCase()));
  }

  children.push(
    labelLine('REF', data.ref),
    labelLine('DATE', data.date),
    new Paragraph({ spacing: { after: 300 }, children: [] }),
    labelLine('SUBJECT', data.subject.toUpperCase(), true),
    new Paragraph({ spacing: { before: 200, after: 200 }, children: [] })
  );

  // ─── Body ─────────────────────────────────────────────────────────────────
  const bodyParagraphs: Paragraph[] = data.body.split('\n').map(
    (line) =>
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: line || ' ',
            font: 'Tahoma',
            size: 22,
          }),
        ],
      })
  );
  children.push(...bodyParagraphs);

  // ─── Signature ────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      spacing: { before: 600, after: 40 },
      children: [new TextRun({ text: data.signatoryName || ' ', bold: true, font: 'Tahoma', size: 22 })],
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
          text: data.from.toUpperCase(),
          bold: true,
          underline: {},
          font: 'Tahoma',
          size: 22,
        }),
      ],
    })
  );

  // ─── Footer ──────────────────────────────────────────────────────────────
  if (footerBuffer.byteLength > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 400, after: 40 },
        children: [
          new ImageRun({
            data: footerBuffer,
            type: 'png',
            transformation: { width: 100, height: 50 },
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 20, after: 10 },
      children: [
        new TextRun({
          text: 'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
          font: 'Tahoma',
          size: 16,
          color: '666666',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 10 },
      children: [
        new TextRun({
          text: 'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
          font: 'Tahoma',
          size: 16,
          color: '666666',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Justice Be Our Shield and Defender',
          bold: true,
          font: 'Tahoma',
          size: 16,
          color: '1A3D1C',
        }),
      ],
    })
  );

  // ─── Create Document ──────────────────────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 },
          },
        },
        children: children as readonly Paragraph[],
      },
    ],
  });

  // ─── Return Blob ──────────────────────────────────────────────────────────
  return Packer.toBlob(doc);
}