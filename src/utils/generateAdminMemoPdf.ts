// src/utils/generateAdminMemoPdf.ts

import jsPDF from 'jspdf';
import type { AdminMemoData } from '../components/templates/SuperAdminMemo';

const JUDICIARY_CREST_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1781759596/JOB_LOGO_ubls4m.jpg';
const FOOTER_EMBLEM_SRC = 'https://res.cloudinary.com/do0yflasl/image/upload/v1782893389/footer-emblem_n0ncm9.jpg';

export async function generateAdminMemoPdf(data: AdminMemoData): Promise<Blob> {
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

  // ─── Add Logo/Crest ──────────────────────────────────────────────────────
  try {
    const response = await fetch(data.crestUrl || JUDICIARY_CREST_SRC);
    const blob = await response.blob();
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const imgWidth = 40;
    const imgHeight = 40;
    const imgX = (pageWidth - imgWidth) / 2;
    doc.addImage(base64, 'PNG', imgX, y, imgWidth, imgHeight);
    y += imgHeight + 4;
  } catch {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REPUBLIC OF KENYA', pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  // ─── Header ──────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICE OF THE REGISTRAR HIGH COURT', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(16);
  doc.text('INTERNAL MEMO', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.line(margin + 30, y, pageWidth - margin - 30, y);
  y += 8;

  // ─── Fields ──────────────────────────────────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');

  doc.text('TO', margin, y);
  doc.text(':', margin + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.to.toUpperCase(), margin + 25, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('FROM', margin, y);
  doc.text(':', margin + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.from.toUpperCase(), margin + 25, y);
  y += 7;

  if (data.cc) {
    doc.setFont('helvetica', 'bold');
    doc.text('CC', margin, y);
    doc.text(':', margin + 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.cc.toUpperCase(), margin + 25, y);
    y += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('REF', margin, y);
  doc.text(':', margin + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.ref.toUpperCase(), margin + 25, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('DATE', margin, y);
  doc.text(':', margin + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.date, margin + 25, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT', margin, y);
  doc.text(':', margin + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.subject.toUpperCase(), margin + 25, y);
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ─── Body ──────────────────────────────────────────────────────────────
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

  // ─── Sign-off ────────────────────────────────────────────────────────────
  checkPage(40);
  y += 20;

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
      y += 18;
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
  const initials = data.signatoryName.split(' ').map(n => n[0]).join('').toUpperCase();
  doc.text(`RHC/${initials}`, margin, y);
  y += 12;

  // ─── Footer ──────────────────────────────────────────────────────────────
  checkPage(30);
  y = pageHeight - margin - 25;

  try {
    const response = await fetch(data.footerEmblemUrl || FOOTER_EMBLEM_SRC);
    const blob = await response.blob();
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    doc.addImage(base64, 'PNG', margin, y - 10, 25, 25);
  } catch {
    // Fallback - continue without image
  }

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

  // Return Blob instead of saving
  return doc.output('blob');
}