// Download utilities for exporting summaries in multiple formats
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

/**
 * Download content as Markdown file
 */
export function downloadAsMarkdown(content: string, filename: string = 'summary'): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Download content as PDF file
 */
export function downloadAsPDF(content: string, filename: string = 'summary'): void {
    const doc = new jsPDF();

    // Configure font and margins
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);

    // Set font
    doc.setFont('helvetica');
    doc.setFontSize(12);

    // Split content into lines that fit the page width
    const lines = doc.splitTextToSize(content, maxWidth);

    let y = margin;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.getHeight();

    for (const line of lines) {
        // Check if we need a new page
        if (y + lineHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }

        // Handle markdown headers (basic parsing)
        if (line.startsWith('## ')) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(line.replace('## ', ''), margin, y);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
        } else if (line.startsWith('# ')) {
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(line.replace('# ', ''), margin, y);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
        } else if (line.startsWith('**') && line.endsWith('**')) {
            doc.setFont('helvetica', 'bold');
            doc.text(line.replace(/\*\*/g, ''), margin, y);
            doc.setFont('helvetica', 'normal');
        } else {
            doc.text(line, margin, y);
        }

        y += lineHeight;
    }

    doc.save(`${filename}.pdf`);
}

/**
 * Download content as DOCX file
 */
export async function downloadAsDOCX(content: string, filename: string = 'summary'): Promise<void> {
    // Parse markdown into document elements
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.startsWith('## ')) {
            // Heading 2
            paragraphs.push(
                new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                })
            );
        } else if (line.startsWith('# ')) {
            // Heading 1
            paragraphs.push(
                new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                })
            );
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            // Bullet point
            paragraphs.push(
                new Paragraph({
                    children: [new TextRun(line.substring(2))],
                    bullet: { level: 0 },
                })
            );
        } else if (line.trim() === '') {
            // Empty line
            paragraphs.push(new Paragraph({ text: '' }));
        } else {
            // Regular paragraph - handle bold text
            const parts: TextRun[] = [];
            const boldRegex = /\*\*(.*?)\*\*/g;
            let lastIndex = 0;
            let match;

            while ((match = boldRegex.exec(line)) !== null) {
                // Text before bold
                if (match.index > lastIndex) {
                    parts.push(new TextRun(line.slice(lastIndex, match.index)));
                }
                // Bold text
                parts.push(new TextRun({ text: match[1], bold: true }));
                lastIndex = match.index + match[0].length;
            }

            // Remaining text
            if (lastIndex < line.length) {
                parts.push(new TextRun(line.slice(lastIndex)));
            }

            paragraphs.push(new Paragraph({ children: parts.length > 0 ? parts : [new TextRun(line)] }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: paragraphs,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.docx`;
    a.click();
    URL.revokeObjectURL(url);
}
