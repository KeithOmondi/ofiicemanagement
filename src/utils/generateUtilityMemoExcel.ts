//generateUtilityMemoExcel.ts


import * as XLSX from 'xlsx';
import type { UtilityMemoData } from '../types/generateUtilityMemoTypes';

export function generateUtilityMemoExcel(data: UtilityMemoData): Blob {
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

  // Body text
  data.bodyText
    .split('\n\n')
    .filter((p) => p.trim().length > 0)
    .forEach((para) => sheetRows.push([para]));
  sheetRows.push([]);

  // ─── Table ──────────────────────────────────────────────────────────────
  const isFuel = data.memoType === 'fuel';

  if (isFuel) {
    // ── Fuel‑only table ──
    sheetRows.push(['S/NO.', 'NAMES', 'FUEL']);
    data.rows.forEach((row, index) => {
      sheetRows.push([index + 1, row.judge_name, row.total]);
    });
    // Grand total row
    sheetRows.push(['', 'GRAND TOTAL', data.grandTotal]);
  } else {
    // ── All‑utilities table ──
    sheetRows.push(['S/NO.', 'NAMES', 'KPLC', 'WATER', 'WIFI', 'TOTAL']);
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
    sheetRows.push([
      '',
      'GRAND TOTAL',
      data.grandKplc || '',
      data.grandWater || '',
      data.grandWifi || '',
      data.grandTotal,
    ]);
  }
  sheetRows.push([]);

  // ─── Amount in words ──────────────────────────────────────────────────
  if (data.grandTotal > 0) {
    sheetRows.push(['Amount in Words:', data.amountInWords.toUpperCase()]);
    sheetRows.push([]);
  }

  // ─── Footer ────────────────────────────────────────────────────────────
  // ✅ REMOVED: signatoryName and signature block - handled by backend
  // Only the footer address remains
  sheetRows.push([]);
  sheetRows.push(['Milimani Law Courts | 3rd Floor, Chamber 337 | P.O. Box 30041-00100 | Nairobi']);
  sheetRows.push(['Tel. +254 0730 181478 | registrarhighcourt@court.go.ke | www.judiciary.go.ke']);
  sheetRows.push(['Justice Be Our Shield and Defender']);

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);

  // ─── Column widths ─────────────────────────────────────────────────────
  if (isFuel) {
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 36 },
      { wch: 14 },
    ];
  } else {
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 36 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
  }

  // ─── Bold formatting ──────────────────────────────────────────────────
  let headerRowIndex = -1;
  let grandTotalRowIndex = -1;
  for (let i = 0; i < sheetRows.length; i++) {
    const row = sheetRows[i];
    if (row.length > 0 && row[0] === 'S/NO.') headerRowIndex = i;
    if (row.length > 1 && row[1] === 'GRAND TOTAL') grandTotalRowIndex = i;
  }

  const boldRows = [headerRowIndex, grandTotalRowIndex].filter(idx => idx >= 0);
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Utility Memo');

  const wbout: ArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}