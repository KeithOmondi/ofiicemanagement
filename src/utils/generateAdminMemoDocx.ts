// src/utils/generateAdminMemoDocx.ts
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import type { AdminMemoData } from "../components/templates/SuperAdminMemo";

export async function generateAdminMemoDocx(
  data: AdminMemoData,
): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        children: [
          // Crest
          new Paragraph({
            children: [
              new TextRun({
                text: "REPUBLIC OF KENYA",
                size: 28,
                bold: true,
                color: "1a3d1c",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "OFFICE OF THE REGISTRAR HIGH COURT",
                size: 32,
                bold: true,
                color: "1a3d1c",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "INTERNAL MEMO",
                size: 32,
                bold: true,
                color: "1a3d1c",
                underline: { type: "single" },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Header fields
          new Paragraph({
            children: [
              new TextRun({ text: "TO", bold: true, size: 22 }),
              new TextRun({ text: ": ", size: 22 }),
              new TextRun({
                text: data.to.toUpperCase(),
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "FROM", bold: true, size: 22 }),
              new TextRun({ text: ": ", size: 22 }),
              new TextRun({
                text: data.from.toUpperCase(),
                bold: true,
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),
          // ─── CC (if provided) ────────────────────────────────────────────
          ...(data.cc ? [
            new Paragraph({
              children: [
                new TextRun({ text: "CC", bold: true, size: 22 }),
                new TextRun({ text: ": ", size: 22 }),
                new TextRun({
                  text: data.cc.toUpperCase(),
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { after: 100 },
            })
          ] : []),
          new Paragraph({
            children: [
              new TextRun({ text: "REF", bold: true, size: 22 }),
              new TextRun({ text: ": ", size: 22 }),
              new TextRun({
                text: data.ref.toUpperCase(),
                bold: true,
                size: 22,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "DATE", bold: true, size: 22 }),
              new TextRun({ text: ": ", size: 22 }),
              new TextRun({ text: data.date, bold: true, size: 22 }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "SUBJECT", bold: true, size: 22 }),
              new TextRun({ text: ": ", size: 22 }),
              new TextRun({
                text: data.subject.toUpperCase(),
                bold: true,
                size: 22,
              }),
            ],
            spacing: { after: 400 },
            border: {
              bottom: { style: "single", size: 3 },
            },
          }),

          // Body
          ...data.body.split("\n").map(
            (paragraph) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: paragraph,
                    size: 22,
                  }),
                ],
                spacing: { after: 200 },
              }),
          ),

          // Sign-off
          new Paragraph({
            children: [new TextRun({ text: "", size: 22 })],
            spacing: { before: 600, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: data.signatoryName, bold: true, size: 22 }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.from.toUpperCase(),
                bold: true,
                size: 22,
                underline: { type: "single" },
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `RHC/${data.signatoryName.split(' ').map(n => n[0]).join('').toUpperCase()}`,
                size: 18,
                color: "666666",
              }),
            ],
            spacing: { after: 400 },
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: "Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi",
                size: 16,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke",
                size: 16,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Justice Be Our Shield and Defender",
                size: 16,
                bold: true,
                color: "1a3d1c",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Memo_${data.ref || "untitled"}.docx`);
}