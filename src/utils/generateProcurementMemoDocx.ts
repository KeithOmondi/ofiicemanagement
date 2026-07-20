// src/utils/generateProcurementMemoDocx.ts
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import type { ProcurementMemoData } from './generateProcurementMemoPdf';

export const generateProcurementMemoDocx = async (data: ProcurementMemoData): Promise<Blob> => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({ text: 'OFFICE OF THE REGISTRAR HIGH COURT', bold: true, size: 28, font: 'Arial' }),
            ],
            alignment: 'center',
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'INTERNAL MEMO', bold: true, size: 24, font: 'Arial' }),
            ],
            alignment: 'center',
          }),
          new Paragraph({ text: '' }),

          // Memo fields
          new Paragraph({ children: [new TextRun({ text: `TO: ${data.to}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `FROM: ${data.from}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `REF: ${data.ref}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `DATE: ${data.date}`, bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `SUBJECT: ${data.subject}`, bold: true })] }),
          new Paragraph({ text: '' }),

          // Body
          new Paragraph({ text: data.bodyText }),
          new Paragraph({ text: '' }),

          // Table
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Item')] }),
                  new TableCell({ children: [new Paragraph('Qty')] }),
                  new TableCell({ children: [new Paragraph('Unit')] }),
                  new TableCell({ children: [new Paragraph('Cost')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(data.itemName)] }),
                  new TableCell({ children: [new Paragraph(String(data.quantity))] }),
                  new TableCell({ children: [new Paragraph(data.unit)] }),
                  new TableCell({ children: [new Paragraph(data.estimatedCost ? data.estimatedCost.toFixed(2) : '—')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Total')], columnSpan: 3 }),
                  new TableCell({ children: [new Paragraph(data.estimatedCost ? (data.estimatedCost * data.quantity).toFixed(2) : '—')] }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: '' }),

          // Signatory
          new Paragraph({ text: 'Signed:' }),
          new Paragraph({ text: data.signatoryName }),
          new Paragraph({ text: data.from }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
};