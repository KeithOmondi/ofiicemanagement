// src/utils/uploadHelpdeskDocument.ts

import type { DocumentEntityType, DocumentFormat, HelpdeskDocument } from "../store/slices/helpdeskDocumentsSlice";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadHelpdeskDocumentParams {
    blob: Blob;
    filename: string;
    ref: string;
    subject: string;
    entity_type: DocumentEntityType;
    entity_id?: string;
    format: DocumentFormat;
}

interface ApiErrorResponse {
    message?: string;
    errors?: Record<string, string[]>;
}

interface HelpdeskApiResponse {
    success: boolean;
    data: HelpdeskDocument;
    message?: string;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

function isHelpdeskResponse(obj: unknown): obj is HelpdeskApiResponse {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'success' in obj &&
        'data' in obj
    );
}

// ─── Helper Functions ────────────────────────────────────────────────────────


// ─── Main Upload Function ────────────────────────────────────────────────────

export async function uploadHelpdeskDocument(
    params: UploadHelpdeskDocumentParams
): Promise<HelpdeskDocument> {
    const form = new FormData();
    
    form.append('file', params.blob, params.filename);
    form.append('ref', params.ref);
    form.append('subject', params.subject);
    form.append('entity_type', params.entity_type);
    form.append('format', params.format);
    if (params.entity_id) {
        form.append('entity_id', params.entity_id);
    }

    const res = await fetch('/api/v1/helpdesk/documents/upload', {
        method: 'POST',
        body: form,
    });

    if (!res.ok) {
        let errorMessage = 'Failed to save document';
        try {
            const errorData = await res.json() as ApiErrorResponse;
            errorMessage = errorData.message || errorMessage;
        } catch {
            // Fallback to default message
        }
        throw new Error(errorMessage);
    }

    const json = await res.json();
    
    if (!isHelpdeskResponse(json)) {
        throw new Error('Invalid response format from server');
    }
    
    return json.data;
}