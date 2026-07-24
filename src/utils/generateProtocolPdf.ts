// src/utils/generateProtocolPdf.ts

import { jsPDF } from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';

interface ProtocolMemoData {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  rows: {
    judgeName: string;
    pjNumber: string;
    designation: string;
    rate: number;
    days: number;
    total: number;
    notes?: string;
  }[];
  grandTotal: number;
  signatoryName: string;
  crestUrl?: string;
  signatureUrl?: string;
  dsaRequired: boolean;
  officersAssigned?: string;
  remarks?: string;
  periodFrom?: string;
  periodTo?: string;
}

// Helper to convert URL to base64 or data URL
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper to add image to PDF with proper error handling
async function addImageToPdf(
  doc: jsPDF,
  imageUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  try {
    // For URLs, fetch and convert to base64
    const base64Image = await urlToBase64(imageUrl);
    
    // Check if it's a valid base64 image
    if (base64Image.startsWith('data:image')) {
      doc.addImage(base64Image, 'PNG', x, y, width, height);
    } else {
      // Try direct approach
      doc.addImage(imageUrl, 'PNG', x, y, width, height);
    }
  } catch (error) {
    console.warn('Failed to add image to PDF:', error);
    throw error;
  }
}

export async function generateProtocolMemoPdf(data: ProtocolMemoData): Promise<Blob> {
  const {
    to,
    from,
    ref,
    date,
    subject,
    bodyText,
    rows,
    grandTotal,
    signatoryName,
    crestUrl,
    signatureUrl,
    dsaRequired,
    officersAssigned,
    remarks,
  } = data;

  // Create PDF with A4 size
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Add crest
  if (crestUrl) {
    try {
      const imgWidth = 30;
      const imgHeight = 30;
      const x = (pageWidth - imgWidth) / 2;
      await addImageToPdf(doc, crestUrl, x, y, imgWidth, imgHeight);
      y += imgHeight + 5;
    } catch (error) {
      console.warn('Failed to load crest image:', error);
      // Continue without the image
    }
  }

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(14);
  doc.text('INTERNAL MEMO', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Meta information
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const metaData: Array<[string, string]> = [
    ['TO:', to],
    ['FROM:', from],
    ['REF:', ref],
    ['DATE:', date],
    ['SUBJECT:', subject],
  ];

  metaData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + labelWidth + 5, y);
    y += 7;
  });

  y += 5;

  // Body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // Split body text into lines
  const bodyLines = doc.splitTextToSize(bodyText, pageWidth - margin * 2);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 6 + 5;

  // Officers Assigned
  if (officersAssigned) {
    doc.text(`Officers Assigned: ${officersAssigned}`, margin, y);
    y += 7;
  }

  // Remarks
  if (remarks) {
    doc.text(`Remarks: ${remarks}`, margin, y);
    y += 7;
  }

  y += 5;

  // DSA Table
  if (dsaRequired && rows.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DSA Details:', margin, y);
    y += 5;

    const tableData = rows.map((row, index) => [
      (index + 1).toString(),
      row.judgeName,
      row.pjNumber,
      row.designation || '—',
      row.rate.toLocaleString(),
      row.days.toString(),
      row.total.toLocaleString(),
    ]);

    // Use autoTable with proper typing
    const tableOptions: UserOptions = {
      startY: y,
      head: [['S/No.', 'Judge Name', 'PJ Number', 'Designation', 'Rate (KES)', 'Days', 'Total (KES)']],
      body: tableData,
      foot: [['', '', '', '', '', 'GRAND TOTAL', grandTotal.toLocaleString()]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 60, 32] as [number, number, number], textColor: [255, 255, 255] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: margin, right: margin },
    };

    autoTable(doc, tableOptions);

    // Get the final Y position from the autoTable result
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 50;
    y = finalY + 10;
  } else if (dsaRequired && rows.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 120, 0);
    doc.text('⚠️ DSA Required: Please add DSA details or toggle DSA off if not needed.', margin, y);
    y += 7;
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Note: DSA is not required for this protocol event.', margin, y);
    y += 7;
  }

  // Signature section
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(signatoryName, margin, y);
  y += 5;

  if (signatureUrl) {
    try {
      const imgWidth = 40;
      const imgHeight = 20;
      await addImageToPdf(doc, signatureUrl, margin, y, imgWidth, imgHeight);
      y += imgHeight + 5;
    } catch (error) {
      console.warn('Failed to load signature image:', error);
      y += 5;
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.text(from, margin, y);
  y += 10;

  // Footer
  const footerText = [
    'Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi',
    'Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke',
    'Justice Be Our Shield and Defender',
  ];

  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText[0], pageWidth / 2, footerY, { align: 'center' });
  doc.text(footerText[1], pageWidth / 2, footerY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 60, 32);
  doc.text(footerText[2], pageWidth / 2, footerY + 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Return as Blob
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}