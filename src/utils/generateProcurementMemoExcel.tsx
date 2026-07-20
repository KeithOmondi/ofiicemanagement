// src/utils/generateProcurementMemoExcel.ts
import * as XLSX from 'xlsx';
import type { ProcurementMemoData } from './generateProcurementMemoPdf';

/**
 * Generates an Excel summary of the procurement memo.
 * Returns a Blob ready for download.
 */
export const generateProcurementMemoExcel = (data: ProcurementMemoData): Blob => {
  const rows = [
    ['Memo Details'],
    ['To', data.to],
    ['From', data.from],
    ['Reference', data.ref],
    ['Date', data.date],
    ['Subject', data.subject],
    [],
    ['Item Details'],
    ['Item Name', data.itemName],
    ['Quantity', data.quantity],
    ['Unit', data.unit],
    ['Estimated Cost per Unit', data.estimatedCost ?? 'N/A'],
    ['Total Estimated Cost', data.estimatedCost ? data.estimatedCost * data.quantity : 'N/A'],
    ['Urgency', data.urgency],
    ['Justification', data.justification],
    ['Requested By', data.requestedBy],
    ['Signatory', data.signatoryName],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Memo');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};