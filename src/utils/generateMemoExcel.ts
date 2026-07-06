// src/utils/generateMemoExcel.ts
//
// Builds a real, editable .xlsx workbook version of the memo — header
// fields, the editable body paragraph, and the DSA schedule as a proper
// table (no images; Excel is a data export, not a facsimile).
// Returns a Blob for upload or download.

import * as XLSX from 'xlsx';

export interface MemoExcelRow {
  judgeName: string;
  pjNumber: string;
  designation: string;
  rate: number;
  days: number;
  total: number;
}

export interface MemoExcelParams {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  rows: MemoExcelRow[];
  grandTotal: number;
  signatoryName: string;
}

export function generateMemoExcel(params: MemoExcelParams): Blob {
  const wsData: (string | number)[][] = [
    ['OFFICE OF THE REGISTRAR HIGH COURT'],
    ['INTERNAL MEMO'],
    [],
    ['TO', params.to],
    ['FROM', params.from],
    ['REF', params.ref],
    ['DATE', params.date],
    ['SUBJECT', params.subject],
    [],
    [params.bodyText],
    [],
    ['#', 'Judge Name', 'PJ Number', 'Designation', 'Rate (KES)', 'Days', 'Total (KES)'],
  ];

  params.rows.forEach((r, i) => {
    wsData.push([i + 1, r.judgeName, r.pjNumber, r.designation || '-', r.rate, r.days, r.total]);
  });

  if (params.rows.length === 0) {
    wsData.push(['—', 'No DSA details available.', '', '', '', '', '']);
  } else {
    wsData.push(['', '', '', '', '', 'GRAND TOTAL', params.grandTotal]);
  }

  wsData.push([]);
  wsData.push([params.signatoryName]);
  wsData.push([params.from]);

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  worksheet['!cols'] = [
    { wch: 4 },
    { wch: 28 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Memo');

  // Generate and return blob instead of saving
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}