// src/utils/generateAdminLetterDocx.ts
import { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';
import type { AdminLetterData } from '../components/templates/SuperAdminLetter';

export async function generateAdminLetterDocx(data: AdminLetterData): Promise<void> {
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
                text: 'THE JUDICIARY',
                size: 28,
                bold: true,
                color: '4a4a4a',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'OFFICE OF THE REGISTRAR HIGH COURT',
                size: 32,
                bold: true,
                color: '1a3d1c',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Ref
          new Paragraph({
            children: [
              new TextRun({ text: 'Ref:', bold: true, size: 22 }),
              new TextRun({ text: `  ${data.ref}`, size: 22 }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 100 },
          }),

          // Date
          new Paragraph({
            children: [
              new TextRun({ text: 'Date:', bold: true, size: 22 }),
              new TextRun({ text: `  ${data.date}`, size: 22 }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 },
          }),

          // To
          new Paragraph({
            children: [
              new TextRun({ text: 'To:', bold: true, size: 22 }),
              new TextRun({ text: `  ${data.to.toUpperCase()}`, size: 22 }),
            ],
            spacing: { after: 200 },
          }),

          // From
          new Paragraph({
            children: [
              new TextRun({ text: 'From:', bold: true, size: 22 }),
              new TextRun({ text: `  ${data.from.toUpperCase()}`, size: 22 }),
            ],
            spacing: { after: 200 },
          }),

          // Subject
          new Paragraph({
            children: [
              new TextRun({ text: 'Subject:', bold: true, size: 22 }),
              new TextRun({ text: `  ${data.subject.toUpperCase()}`, size: 22 }),
            ],
            spacing: { after: 400 },
          }),

          // Body
          ...data.body.split('\n').map((paragraph) => 
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph,
                  size: 22,
                }),
              ],
              spacing: { after: 200 },
            })
          ),

          // Yours sincerely
          new Paragraph({
            children: [
              new TextRun({ text: 'Yours sincerely,', size: 22 }),
            ],
            spacing: { before: 400, after: 300 },
          }),

          // Sign-off
          new Paragraph({
            children: [
              new TextRun({ text: data.signatoryName, bold: true, size: 22 }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: data.from.toUpperCase(), bold: true, size: 22, underline: { type: 'single' } }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ 
                text: `RHC/${data.signatoryName.split(' ').map(n => n[0]).join('').toUpperCase()}`, 
                size: 18, 
                color: '666666' 
              }),
            ],
            spacing: { after: 400 },
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: 'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
                size: 16,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
                size: 16,
                color: '666666',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Justice Be Our Shield and Defender',
                size: 16,
                bold: true,
                color: '1a3d1c',
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
  saveAs(blob, `Letter_${data.ref || 'untitled'}.docx`);
}