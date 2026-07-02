// src/utils/generateMemoExcel.ts
//
// Builds a real, editable .xlsx workbook version of the memo — header
// fields, the editable body paragraph, and the DSA schedule as a proper
// table (no images; Excel is a data export, not a facsimile).

import * as XLSX from 'xlsx';

export interface MemoExcelRow {
  judgeName: string;
  pjNumber: string;
  designation: string;
  rate: number;
  days: number;
  total: number;
  notes: string;
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
  amountInWords: string;
  signatoryName: string;
}

export function generateMemoExcel(params: MemoExcelParams): void {
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
    ['#', 'Judge Name', 'PJ Number', 'Designation', 'Rate (KES)', 'Days', 'Total (KES)', 'Notes'],
  ];

  params.rows.forEach((r, i) => {
    wsData.push([i + 1, r.judgeName, r.pjNumber, r.designation || '-', r.rate, r.days, r.total, r.notes || '-']);
  });

  if (params.rows.length === 0) {
    wsData.push(['—', 'No DSA details available.', '', '', '', '', '', '']);
  } else {
    wsData.push(['', '', '', '', '', 'GRAND TOTAL', params.grandTotal, '']);
  }

  wsData.push([]);
  wsData.push(['Amount in Words:', params.amountInWords.toUpperCase()]);
  wsData.push([]);
  wsData.push([params.signatoryName]);
  wsData.push([params.from]);

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  worksheet['!cols'] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Memo');

  const filename = `${(params.ref || 'memo').replace(/[\\/:*?"<>|]/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}