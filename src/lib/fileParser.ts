// File Validation Utilities
// PDF parsing and OCR are now handled server-side by FastAPI

// Maximum file size (200MB)
const MAX_FILE_SIZE = 200 * 1024 * 1024;

// Allowed MIME types with their expected extensions
const ALLOWED_TYPES: Record<string, string[]> = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    '': ['.md', '.txt'] // Some browsers don't set MIME for .md files
};

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate file before upload (size and type checks)
 * Actual parsing is handled server-side via FastAPI
 */
export const validateFile = (file: File): FileValidationResult => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: 'File too large. Maximum size is 200MB.'
        };
    }

    // Validate MIME type matches extension
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const allowedExtensions = ALLOWED_TYPES[file.type] || [];

    const isValidType = allowedExtensions.includes(extension) ||
        (!file.type && ['.txt', '.md'].includes(extension)) ||
        file.type === 'application/pdf'; // Always allow PDFs

    if (!isValidType && file.type && !Object.keys(ALLOWED_TYPES).includes(file.type)) {
        return {
            valid: false,
            error: 'Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.'
        };
    }

    return { valid: true };
};

/**
 * Get file extension
 */
export const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || 'txt';
};

// Legacy exports for backward compatibility (deprecated, do not use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const parseFile = async (_file: File): Promise<string> => {
    console.warn('[fileParser] parseFile is deprecated. Use server-side processing.');
    return '';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const parseFileStream = async (
    _file: File,
    _onChunk: (chunk: string, progress: number) => Promise<void>
): Promise<void> => {
    console.warn('[fileParser] parseFileStream is deprecated. Use server-side processing.');
};
