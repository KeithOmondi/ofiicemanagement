// src/features/documents/documentTemplates.ts

import { getTemplate } from "../../features/documents/templateLoader";


export type TemplateType = 'memo' | 'letter' | 'draft';

interface TemplateContext {
  registrarName?: string;
  registrarTitle?: string;
  date?: string;
  refNo?: string;
  to?: string;
  subject?: string;
  recipient?: string;
  body?: string;
}

const formatDate = (): string => {
  return new Date().toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const generateRefNo = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RHC/${year}/${random}`;
};

export const getDocumentTemplate = (
  type: TemplateType,
  context: TemplateContext
): string => {
  const date = context.date || formatDate();
  const refNo = context.refNo || generateRefNo();

  // getTemplate is async in the frontend, sync in the backend
  // We'll handle both cases
  return getTemplate(type, {
    registrarName: context.registrarName || 'Hon. Clara Otieno-Omondi',
    registrarTitle: context.registrarTitle || 'REGISTRAR, HIGH COURT',
    date,
    refNo,
    to: context.to || '',
    subject: context.subject || '',
    recipient: context.recipient || '',
    body: context.body || '',
  });
};