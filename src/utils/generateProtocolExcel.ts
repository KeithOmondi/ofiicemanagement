// src/utils/generateProtocolExcel.ts

import * as XLSX from 'xlsx';

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
  dsaRequired: boolean;
  officersAssigned?: string;
  remarks?: string;
  periodFrom?: string;
  periodTo?: string;
}

export function generateProtocolMemoExcel(data: ProtocolMemoData): Blob {
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
    dsaRequired,
    officersAssigned,
    remarks,
    periodFrom,
    periodTo,
  } = data;

  const workbook = XLSX.utils.book_new();

  // ─── Sheet 1: Memo ──────────────────────────────────────────────────────

  const memoData: (string | number)[][] = [];

  // Header
  memoData.push(['OFFICE OF THE REGISTRAR HIGH COURT']);
  memoData.push(['INTERNAL MEMO']);
  memoData.push([]);

  // Meta information
  memoData.push(['TO:', to]);
  memoData.push(['FROM:', from]);
  memoData.push(['REF:', ref]);
  memoData.push(['DATE:', date]);
  memoData.push(['SUBJECT:', subject]);
  memoData.push([]);

  // Body
  memoData.push(['BODY:']);
  memoData.push([bodyText]);
  memoData.push([]);

  // Officers Assigned
  if (officersAssigned) {
    memoData.push(['Officers Assigned:', officersAssigned]);
    memoData.push([]);
  }

  // Remarks
  if (remarks) {
    memoData.push(['Remarks:', remarks]);
    memoData.push([]);
  }

  // DSA Table
  if (dsaRequired && rows.length > 0) {
    memoData.push(['DSA Details:']);
    memoData.push([]);

    // Table headers
    memoData.push(['S/No.', 'Judge Name', 'PJ Number', 'Designation', 'Rate (KES)', 'Days', 'Total (KES)']);

    // Table rows
    rows.forEach((row, index) => {
      memoData.push([
        index + 1,
        row.judgeName,
        row.pjNumber,
        row.designation || '—',
        row.rate,
        row.days,
        row.total,
      ]);
    });

    // Grand total
    memoData.push([]);
    memoData.push(['', '', '', '', '', 'GRAND TOTAL', grandTotal]);
  } else if (dsaRequired && rows.length === 0) {
    memoData.push(['⚠️ DSA Required: Please add DSA details or toggle DSA off if not needed.']);
  } else {
    memoData.push(['Note: DSA is not required for this protocol event.']);
  }

  memoData.push([]);
  memoData.push(['Signatory:', signatoryName]);
  memoData.push(['From:', from]);

  const memoSheet = XLSX.utils.aoa_to_sheet(memoData);

  // Set column widths
  memoSheet['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(workbook, memoSheet, 'Memo');

  // ─── Sheet 2: DSA Details ──────────────────────────────────────────────

  if (dsaRequired && rows.length > 0) {
    const dsaData: (string | number)[][] = [];

    // Header
    dsaData.push(['PROTOCOL EVENT DSA DETAILS']);
    dsaData.push([]);
    dsaData.push(['Subject:', subject]);
    dsaData.push(['Period From:', periodFrom || 'N/A']);
    dsaData.push(['Period To:', periodTo || 'N/A']);
    dsaData.push(['Officers Assigned:', officersAssigned || 'N/A']);
    dsaData.push(['Remarks:', remarks || 'N/A']);
    dsaData.push([]);

    // Table headers
    dsaData.push(['S/No.', 'Judge Name', 'PJ Number', 'Designation', 'Rate (KES)', 'Days', 'Total (KES)']);

    // Table rows
    rows.forEach((row, index) => {
      dsaData.push([
        index + 1,
        row.judgeName,
        row.pjNumber,
        row.designation || '—',
        row.rate,
        row.days,
        row.total,
      ]);
    });

    // Grand total
    dsaData.push([]);
    dsaData.push(['', '', '', '', '', 'GRAND TOTAL', grandTotal]);

    const dsaSheet = XLSX.utils.aoa_to_sheet(dsaData);

    // Set column widths
    dsaSheet['!cols'] = [
      { wch: 10 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(workbook, dsaSheet, 'DSA Details');
  }

  // ─── Sheet 3: Summary ──────────────────────────────────────────────────

  const summaryData: (string | number)[][] = [];

  summaryData.push(['PROTOCOL EVENT SUMMARY']);
  summaryData.push([]);
  summaryData.push(['Subject:', subject]);
  summaryData.push(['Reference:', ref]);
  summaryData.push(['Date:', date]);
  summaryData.push(['Period From:', periodFrom || 'N/A']);
  summaryData.push(['Period To:', periodTo || 'N/A']);
  summaryData.push(['DSA Required:', dsaRequired ? 'Yes' : 'No']);
  summaryData.push(['Number of Members:', rows.length]);
  summaryData.push(['Total DSA:', grandTotal]);
  summaryData.push(['Signatory:', signatoryName]);
  summaryData.push(['From:', from]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // ─── Generate Excel file ──────────────────────────────────────────────

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return blob;
}