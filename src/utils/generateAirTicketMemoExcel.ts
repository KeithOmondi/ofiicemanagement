// src/utils/generateAirTicketMemoExcel.ts
//
// Builds a real .xlsx workbook for AIR TICKET requests.

import * as XLSX from 'xlsx';

export interface AirTicketScheduleRow {
  name: string;
  date: string;
  route: string;
  preferredTime: string;
}

export interface AirTicketMemoExcelParams {
  to: string;
  from: string;
  ref: string;
  date: string;
  subject: string;
  bodyText: string;
  scheduleRows: AirTicketScheduleRow[];
  signatoryName: string;
  fromDepartment?: string;
}

export function generateAirTicketMemoExcel(params: AirTicketMemoExcelParams): Blob {
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
    ['Name', 'Date', 'Preferred Time'],
  ];

  params.scheduleRows.forEach((row) => {
    wsData.push([row.name, `${row.date}\n${row.route}`, row.preferredTime]);
  });

  if (params.scheduleRows.length === 0) {
    wsData.push(['—', 'No travel schedule available.', '']);
  }

  wsData.push([]);
  wsData.push([params.signatoryName]);
  const fromText = params.fromDepartment || params.from;
  wsData.push([fromText]);

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 40 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Memo');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}