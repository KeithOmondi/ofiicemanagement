// src/features/documents/templateLoader.ts
/**
 * Frontend template loader - uses Vite's raw import for HTML files
 * These templates are bundled with the frontend build
 */

// Import templates as raw strings using Vite's ?raw query parameter
import memoTemplate from './templates/memo.html?raw';
import letterTemplate from './templates/letter.html?raw';
import draftTemplate from './templates/draft.html?raw';

// Cache templates in memory
const templateCache: Record<string, string> = {
  memo: memoTemplate,
  letter: letterTemplate,
  draft: draftTemplate,
};

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

/**
 * Get a template and interpolate placeholders
 * This runs in the browser (sync - templates are already loaded)
 */
export function getTemplate(
  type: TemplateType,
  context: TemplateContext
): string {
  const template = templateCache[type];
  if (!template) {
    throw new Error(`Template "${type}" not found`);
  }

  // Interpolate {{placeholders}}
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key as keyof TemplateContext];
    return value !== undefined ? String(value) : match;
  });
}

// Alias for backward compatibility
export const getTemplateSync = getTemplate;

// For compatibility with existing code
export const getDocumentTemplate = getTemplate;