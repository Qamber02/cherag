// Security: Maximum file size (Increased to 200MB)
const MAX_FILE_SIZE = 200 * 1024 * 1024;

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
    // Legacy support for small files or if full content is strictly needed
    let content = '';
    await parseFileStream(file, async (chunk) => {
        content += chunk + '\n';
    });
    return content.trim();
};

export const parseFileStream = async (
    file: File,
    onChunk: (chunk: string, progress: number) => Promise<void>
): Promise<void> => {
    // Security: Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('File too large. Maximum size is 200MB.');
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
        return parsePDFStream(file, onChunk);
    } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword'
    ) {
        // DOCX doesn't support easy streaming, fall back to full parse then chunk
        const fullText = await parseDOCX(file);
        // Split into reasonable chunks (e.g. 50kb) to simulate streaming
        const chunkSize = 50 * 1024;
        for (let i = 0; i < fullText.length; i += chunkSize) {
            await onChunk(fullText.slice(i, i + chunkSize), (i + chunkSize) / fullText.length);
        }
    } else if (fileType === 'text/plain' || fileType === 'text/markdown' || file.name.endsWith('.md')) {
        return parseTextStream(file, onChunk);
    } else {
        throw new Error('Unsupported file type');
    }
};

const parsePDFStream = async (
    file: File,
    onChunk: (chunk: string, progress: number) => Promise<void>
): Promise<void> => {
    // Dynamically import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    // Dynamically import worker
    const pdfWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

    // Helper for OCR (lazy loaded)
    const performOCR = async (canvas: HTMLCanvasElement): Promise<string> => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const Tesseract = await import('tesseract.js');
        const { data: { text } } = await Tesseract.default.recognize(
            canvas,
            'eng',
            // { logger: m => console.log('[OCR]', m) }
        );
        return text;
    };

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    // Process page by page to avoid OOM
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const strings = content.items.map((item: any) => item.str);
        let pageText = strings.join(' ') + '\n';

        // OCR FALLBACK: If text is sparse (< 50 chars), assume it's an image/scanned page
        if (pageText.trim().length < 50) {
            console.log(`[FileParser] Page ${i} has insufficient text (${pageText.length} chars). Attempting OCR...`);

            try {
                const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better recognition
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await page.render({ canvasContext: context, viewport: viewport } as any).promise;
                    const ocrText = await performOCR(canvas);
                    if (ocrText.trim().length > 0) {
                        pageText = `[OCR Page ${i}]\n${ocrText}\n`;
                    }
                }
            } catch (err) {
                console.warn(`[FileParser] OCR Failed for page ${i}`, err);
                // Fallback to empty string if OCR fails, don't crash
            }
        }

        await onChunk(pageText, i / pdf.numPages);

        // Help GC
        page.cleanup();
    }
};

const parseDOCX = async (file: File): Promise<string> => {
    // Dynamically import mammoth
    const mammoth = (await import('mammoth')).default;

    // Mammoth needs array buffer, might be heavy for 200MB file but text is usually small.
    // If strict 200MB limit for DOCX is needed, we'd need a different parser.
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
};

const parseTextStream = async (
    file: File,
    onChunk: (chunk: string, progress: number) => Promise<void>
): Promise<void> => {
    const stream = file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let totalRead = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalRead += value.byteLength;
        const chunk = decoder.decode(value, { stream: true });
        await onChunk(chunk, totalRead / file.size);
    }
};



