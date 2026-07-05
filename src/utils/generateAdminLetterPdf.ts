// src/utils/generateAdminLetterPdf.ts
import jsPDF from 'jspdf';
import type { AdminLetterData } from '../components/templates/SuperAdminLetter';

export async function generateAdminLetterPdf(
  data: AdminLetterData, 
  returnBlob?: boolean
): Promise<void | Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 25;
  let y = margin;

  const checkPage = (needed: number = 20) => {
    if (y > pageHeight - margin - needed) {
      doc.addPage();
      y = margin;
    }
  };

  // --- Header ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('THE JUDICIARY', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(14);
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Ref
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ref:', pageWidth - margin - 60, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.ref, pageWidth - margin - 30, y);
  y += 7;

  // Date
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - margin - 60, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, pageWidth - margin - 30, y);
  y += 12;

  // To
  doc.setFont('helvetica', 'bold');
  doc.text('To:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.to.toUpperCase(), margin + 20, y);
  y += 8;

  // From
  doc.setFont('helvetica', 'bold');
  doc.text('From:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.from.toUpperCase(), margin + 20, y);
  y += 8;

  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('Subject:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.subject.toUpperCase(), margin + 20, y);
  y += 10;

  // --- Body ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const lines = data.body.split('\n');
  for (const line of lines) {
    checkPage(15);
    if (line.trim() === '') {
      y += 4;
      continue;
    }
    
    const wrappedLines = doc.splitTextToSize(line, pageWidth - margin * 2);
    for (const wrapped of wrappedLines) {
      checkPage(10);
      doc.text(wrapped, margin, y);
      y += 6;
    }
    y += 2;
  }

  // --- Yours sincerely ---
  checkPage(40);
  y += 20;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.text('Yours sincerely,', margin, y);
  y += 12;

  // Sign-off
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(data.signatoryName, margin, y);
  y += 4;

  if (data.signatureUrl) {
    try {
      const response = await fetch(data.signatureUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'PNG', margin, y, 40, 15);
      y += 20;
    } catch {
      doc.line(margin, y + 2, margin + 40, y + 2);
      y += 8;
    }
  } else {
    doc.line(margin, y + 2, margin + 40, y + 2);
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(data.from.toUpperCase(), margin, y);
  y += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(102, 102, 102);
  doc.text(`RHC/${data.signatoryName.split(' ').map(n => n[0]).join('').toUpperCase()}`, margin, y);
  y += 12;

  // --- Footer ---
  checkPage(30);
  y = pageHeight - margin - 25;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102);
  doc.text('Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 61, 28);
  doc.text('Justice Be Our Shield and Defender', pageWidth / 2, y, { align: 'center' });

  // If returnBlob is true, return the PDF as a Blob
  if (returnBlob) {
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  // Otherwise, save the PDF and return nothing (void)
  doc.save(`Letter_${data.ref || 'untitled'}.pdf`);
}