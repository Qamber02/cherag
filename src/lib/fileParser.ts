import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
// Use local worker to avoid CDN issues and strict CSP
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Security: Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Security: Allowed MIME types with their expected extensions
const ALLOWED_TYPES: Record<string, string[]> = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    '': ['.md', '.txt'] // Some browsers don't set MIME for .md files
};

export const parseFile = async (file: File): Promise<string> => {
    // Security: Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File too large. Maximum size is 10MB.');
    }

    // Security: Validate MIME type matches extension
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const allowedExtensions = ALLOWED_TYPES[file.type] || [];

    // Allow if type matches OR if it's an unrecognized type with valid extension
    const isValidType = allowedExtensions.includes(extension) ||
        (!file.type && ['.txt', '.md'].includes(extension));

    if (!isValidType && file.type && !Object.keys(ALLOWED_TYPES).includes(file.type)) {
        throw new Error('Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.');
    }

    const fileType = file.type;

    if (fileType === 'application/pdf') {
        return parsePDF(file);
    } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword'
    ) {
        return parseDOCX(file);
    } else if (fileType === 'text/plain' || fileType === 'text/markdown' || file.name.endsWith('.md')) {
        return parseText(file);
    } else {
        throw new Error('Unsupported file type');
    }
};

const parsePDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(' ') + '\\n';
    }

    return text.trim();
};

const parseDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
};

const parseText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};
