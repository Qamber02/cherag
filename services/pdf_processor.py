"""
PDF Processor for Slide Decks
Memory-efficient PyMuPDF-based extraction with slide-aware cleaning.
Handles low-text density slides without requiring local OCR.
"""

import re
import fitz  # PyMuPDF
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class PageResult:
    """Result of processing a single PDF page."""
    page: int
    text: str
    type: str  # 'slide', 'text', 'visual'
    char_count: int


class PDFProcessor:
    """
    Robust PDF processor optimized for slide decks.
    Handles low-text slides, removes artifacts, and maintains memory efficiency.
    """
    
    # Artifacts to remove (case-insensitive)
    FOOTER_ARTIFACTS = [
        "NotebookLM",
    ]
    
    # Regex patterns for cleaning
    FOOTER_ARTIFACTS_PATTERN = re.compile(r'NotebookLM', re.IGNORECASE)
    CITATION_PATTERN = re.compile(r'\[\d+\]')  # [1], [2], [23], etc.
    PAGE_NUMBER_PATTERN = re.compile(r'^[\s]*\d+[\s]*$', re.MULTILINE)  # Lines with just numbers
    PAGE_MARKER_PATTERN = re.compile(r'---\s*PAGE\s*\d+\s*---', re.IGNORECASE)
    MULTIPLE_SPACES = re.compile(r'[ \t]+')
    MULTIPLE_NEWLINES = re.compile(r'\n{3,}')
    
    # Thresholds
    MIN_TEXT_THRESHOLD = 50  # Characters below this = visual/low-text slide
    
    def __init__(self):
        pass
    
    def clean_text(self, text: str) -> str:
        """
        Clean extracted text by removing artifacts, citations, and formatting issues.
        
        Args:
            text: Raw extracted text from PDF page
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        cleaned = text
        
        # Remove footer artifacts (NotebookLM, etc.)
        cleaned = self.FOOTER_ARTIFACTS_PATTERN.sub("", cleaned)
        
        # Remove citation markers [1], [2], etc.
        cleaned = self.CITATION_PATTERN.sub("", cleaned)
        
        # Remove page markers like "--- PAGE 3 ---"
        cleaned = self.PAGE_MARKER_PATTERN.sub("", cleaned)
        
        # Remove lines that are just page numbers
        lines = cleaned.split('\n')
        cleaned_lines = []
        for line in lines:
            stripped = line.strip()
            # Skip lines that are just numbers (page numbers)
            if stripped and not stripped.isdigit():
                cleaned_lines.append(line)
        cleaned = '\n'.join(cleaned_lines)
        
        # Normalize whitespace
        cleaned = self.MULTIPLE_SPACES.sub(" ", cleaned)
        cleaned = self.MULTIPLE_NEWLINES.sub("\n\n", cleaned)
        
        # Strip leading/trailing whitespace
        cleaned = cleaned.strip()
        
        return cleaned
    
    def classify_page(self, char_count: int) -> str:
        """
        Classify page type based on text content.
        
        Args:
            char_count: Number of characters after cleaning
            
        Returns:
            Page type: 'visual', 'slide', or 'text'
        """
        if char_count < self.MIN_TEXT_THRESHOLD:
            return "visual"
        elif char_count < 200:
            return "slide"
        else:
            return "text"
    
    def process_page(self, page: fitz.Page, page_num: int) -> PageResult:
        """
        Process a single PDF page.
        
        Args:
            page: PyMuPDF page object
            page_num: 1-indexed page number
            
        Returns:
            PageResult with cleaned text and classification
        """
        # Extract text
        raw_text = page.get_text()
        
        # Clean the text
        cleaned_text = self.clean_text(raw_text)
        char_count = len(cleaned_text)
        
        # Classify the page
        page_type = self.classify_page(char_count)
        
        # For visual/low-text pages, add placeholder
        if page_type == "visual":
            cleaned_text = f"[Visual/Low-Text Slide - Page {page_num}]"
            if cleaned_text.strip():
                # Append any text we did find
                cleaned_text += f"\n{cleaned_text}" if len(self.clean_text(raw_text)) > 0 else ""
        
        return PageResult(
            page=page_num,
            text=cleaned_text,
            type=page_type,
            char_count=char_count
        )
    
    def process_pdf_bytes(self, pdf_bytes: bytes) -> List[Dict]:
        """
        Process a PDF from bytes (memory-efficient streaming).
        
        Args:
            pdf_bytes: PDF file content as bytes
            
        Returns:
            List of page dictionaries with cleaned content
        """
        results = []
        
        # Open PDF from bytes (memory efficient)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                result = self.process_page(page, page_num + 1)  # 1-indexed
                
                results.append({
                    "page": result.page,
                    "text": result.text,
                    "type": result.type,
                    "char_count": result.char_count
                })
                
        finally:
            doc.close()
        
        return results
    
    def process_pdf_file(self, file_path: str) -> List[Dict]:
        """
        Process a PDF from file path.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            List of page dictionaries with cleaned content
        """
        with open(file_path, 'rb') as f:
            return self.process_pdf_bytes(f.read())
    
    def get_all_text(self, pages: List[Dict], include_visual: bool = True) -> str:
        """
        Combine all page texts into a single string.
        
        Args:
            pages: List of page dictionaries from process_pdf_*
            include_visual: Whether to include visual/low-text placeholders
            
        Returns:
            Combined text from all pages
        """
        texts = []
        for page in pages:
            if page["type"] == "visual" and not include_visual:
                continue
            if page["text"]:
                texts.append(page["text"])
        
        return "\n\n".join(texts)
    
    def get_stats(self, pages: List[Dict]) -> Dict:
        """
        Get processing statistics.
        
        Args:
            pages: List of page dictionaries
            
        Returns:
            Statistics dictionary
        """
        total_pages = len(pages)
        visual_pages = sum(1 for p in pages if p["type"] == "visual")
        slide_pages = sum(1 for p in pages if p["type"] == "slide")
        text_pages = sum(1 for p in pages if p["type"] == "text")
        total_chars = sum(p["char_count"] for p in pages)
        
        return {
            "total_pages": total_pages,
            "visual_pages": visual_pages,
            "slide_pages": slide_pages,
            "text_pages": text_pages,
            "total_characters": total_chars,
            "avg_chars_per_page": total_chars // total_pages if total_pages > 0 else 0
        }


# Singleton instance for easy import
pdf_processor = PDFProcessor()


def process_slide_deck(pdf_bytes: bytes) -> List[Dict]:
    """
    Convenience function to process a slide deck PDF.
    
    Args:
        pdf_bytes: PDF file content as bytes
        
    Returns:
        List of page dictionaries: [{"page": 1, "text": "...", "type": "slide"}, ...]
    """
    return pdf_processor.process_pdf_bytes(pdf_bytes)


def clean_slide_text(text: str) -> str:
    """
    Convenience function to clean slide text.
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text
    """
    return pdf_processor.clean_text(text)
