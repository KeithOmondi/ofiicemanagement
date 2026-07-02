// src/utils/generateUtilityMemoExcel.ts
import * as XLSX from 'xlsx';
import type { UtilityMemoData } from '../types/generateUtilityMemoTypes';

export function generateUtilityMemoExcel(data: UtilityMemoData): void {
  const sheetRows: (string | number)[][] = [];

  // Header block
  sheetRows.push(['OFFICE OF THE REGISTRAR HIGH COURT']);
  sheetRows.push(['INTERNAL MEMO']);
  sheetRows.push([]);
  sheetRows.push(['FROM', data.from.toUpperCase()]);
  sheetRows.push(['TO', data.to.toUpperCase()]);
  sheetRows.push(['DATE', data.date]);
  sheetRows.push(['SUBJECT', data.subject.toUpperCase()]);
  sheetRows.push([]);

  // Body text (one row per paragraph)
  data.bodyText
    .split('\n\n')
    .filter((p) => p.trim().length > 0)
    .forEach((para) => sheetRows.push([para]));
  sheetRows.push([]);

  // Table header
  const tableHeaderRowIndex = sheetRows.length;
  sheetRows.push(['S/NO.', 'NAMES', 'KPLC', 'WATER', 'WIFI', 'TOTAL']);

  // Table rows
  data.rows.forEach((row, index) => {
    sheetRows.push([
      index + 1,
      row.judge_name,
      row.kplc > 0 ? row.kplc : '',
      row.water > 0 ? row.water : '',
      row.wifi > 0 ? row.wifi : '',
      row.total,
    ]);
  });

  // Grand total row
  const grandTotalRowIndex = sheetRows.length;
  sheetRows.push(['', 'GRAND TOTAL', data.grandKplc || '', data.grandWater || '', data.grandWifi || '', data.grandTotal]);
  sheetRows.push([]);

  if (data.grandTotal > 0) {
    sheetRows.push(['Amount in Words:', data.amountInWords.toUpperCase()]);
    sheetRows.push([]);
  }

  sheetRows.push([]);
  sheetRows.push([data.signatoryName]);
  sheetRows.push([data.from.toUpperCase()]);
  sheetRows.push([]);
  sheetRows.push(['Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi']);
  sheetRows.push(['Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke']);
  sheetRows.push(['Justice Be Our Shield and Defender']);

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

  // Column widths
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 36 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  // Bold the table header row and grand total row (basic cell styling;
  // full styling requires xlsx-style/exceljs — this keeps values correct
  // and readable, formatting can be enhanced later if needed)
  const boldRows = [tableHeaderRowIndex, grandTotalRowIndex];
  boldRows.forEach((r) => {
    for (let c = 0; c < 6; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { font: { bold: true } };
      }
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Utility Memo');

  const filename = `Utility_Memo_${data.date.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, filename);
}