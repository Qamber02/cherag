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

    // Validate Extension
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const validExtensions = new Set(['.pdf', '.docx', '.doc', '.txt', '.md']);

    if (!validExtensions.has(extension)) {
        return {
            valid: false,
            error: `Unsupported file extension: ${extension}. Allowed: PDF, DOCX, TXT, MD.`
        };
    }

    // Validate MIME Type (if present)
    if (file.type) {
        const allowedExtensionsForType = ALLOWED_TYPES[file.type];
        // If the browser reports a MIME type we know about, check if the extension matches
        if (allowedExtensionsForType && !allowedExtensionsForType.includes(extension)) {
            // Edge case: .md files often reported as text/plain, which is valid in our map
            // But if we get application/pdf for a .txt file, that's invalid.
            return {
                valid: false,
                error: `File type mismatch. The file extension ${extension} does not match the detected type ${file.type}.`
            };
        }

        // If the browser reports a MIME type we DON'T know about, but extension is valid,
        // we might crave to warn, but usually we trust the extension check above for generic types.
        // However, strictly enforcing known MIME types adds security.
        if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
            // Special case: Some systems might report weird MIME types for markdown/text
            if (!['.md', '.txt'].includes(extension)) {
                return {
                    valid: false,
                    error: `Unsupported file type: ${file.type}`
                };
            }
        }
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
