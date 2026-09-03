// generateSensitizationExcel.ts

import * as XLSX from 'xlsx';

export function generateSensitizationExcel(data: {
  memoNumber: string;
  date: string;
  from: string;
  to: string;
  subject: string;
  location: string;
  travelStartDate: string;
  travelEndDate: string;
  sensitizationPeriod: string;
  teamMembers: Array<{
    s_no: number;
    name: string;
    pjNumber: string;
    rank: string;
    days: number;
    dsaRate: number;
    total: number;
    isDriver?: boolean;
  }>;
  grandTotal: number;
  preparedBy: string;
  title: string;
}): Blob {
  const sheetRows: (string | number)[][] = [];

  // Header block
  sheetRows.push(['OFFICE OF THE REGISTRAR HIGH COURT']);
  sheetRows.push(['INTERNAL MEMO']);
  sheetRows.push([]);
  sheetRows.push(['MEMO NO.', data.memoNumber]);
  sheetRows.push(['DATE', data.date]);
  sheetRows.push(['FROM', data.from.toUpperCase()]);
  sheetRows.push(['TO', data.to.toUpperCase()]);
  sheetRows.push(['SUBJECT', data.subject.toUpperCase()]);
  sheetRows.push([]);

  // Visit Details
  sheetRows.push(['LOCATION', data.location]);
  sheetRows.push(['TRAVEL START DATE', data.travelStartDate]);
  sheetRows.push(['TRAVEL END DATE', data.travelEndDate]);
  sheetRows.push(['SENSITIZATION PERIOD', data.sensitizationPeriod]);
  sheetRows.push([]);

  // Body text
  sheetRows.push(['The Principal Registry has achieved an end-to-end automated process of its operations.']);
  sheetRows.push(['Consequently, and pursuant to the Hon. Chief Registrar\'s memo on implementation of automated processing of gazette notices in succession causes, all stations are required to submit these notices through the CTS.']);
  sheetRows.push([]);
  sheetRows.push([`In this regard, a team from Principal Registry will visit ${data.location} for sensitization from ${data.sensitizationPeriod} (travel dates ${data.travelStartDate} to ${data.travelEndDate}).`]);
  sheetRows.push([]);
  sheetRows.push(['We request for approval and facilitation of DSA as tabulated below:']);
  sheetRows.push([]);

  // ─── Table ──────────────────────────────────────────────────────────────
  sheetRows.push(['S/NO.', 'NAME', 'PJ NO.', 'RANK', 'DAYS', 'DSA RATE', 'TOTAL', 'DRIVER']);
  
  data.teamMembers.forEach((member) => {
    sheetRows.push([
      member.s_no,
      member.name,
      member.pjNumber,
      member.rank,
      member.days,
      member.dsaRate,
      member.total,
      member.isDriver ? 'Yes' : '',
    ]);
  });

  // Grand total row
  sheetRows.push(['', '', '', '', '', '', data.grandTotal, '']);
  sheetRows.push(['', '', '', '', '', 'GRAND TOTAL', data.grandTotal, '']);
  sheetRows.push([]);

  // Closing text
  sheetRows.push(['Approval and facilitation of the above DSA is kindly requested.']);
  sheetRows.push([]);
  sheetRows.push([]);

  // Prepared By
  sheetRows.push(['Prepared By:']);
  sheetRows.push([data.preparedBy]);
  sheetRows.push([data.title]);
  sheetRows.push(['']);
  sheetRows.push(['Signature / Stamp: _____________________']);
  sheetRows.push([]);

  // ─── Footer ────────────────────────────────────────────────────────────
  sheetRows.push(['Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi']);
  sheetRows.push(['Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke']);
  sheetRows.push(['Justice Be Our Shield and Defender']);

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

  // ─── Column widths ─────────────────────────────────────────────────────
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
  ];

  // ─── Bold formatting ──────────────────────────────────────────────────
  let headerRowIndex = -1;
  let grandTotalRowIndex = -1;
  for (let i = 0; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    if (row.length > 0 && row[0] === 'S/NO.') headerRowIndex = i;
    if (row.length > 1 && row[1] === 'GRAND TOTAL') grandTotalRowIndex = i;
  }

  const boldRows = [
    headerRowIndex, 
    grandTotalRowIndex,
    0, // Title row
    3, // Memo No.
    4, // Date
    5, // From
    6, // To
    7, // Subject
  ].filter(idx => idx >= 0);

  boldRows.forEach((r) => {
    const row = sheetRows[r];
    if (!row) return;
    for (let c = 0; c < row.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { font: { bold: true } };
      }
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sensitization Memo');

  const wbout: ArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}