import sys
from unittest.mock import MagicMock
import unittest

# Mock fitz module before importing pdf_processor since it's not available in the test environment
sys.modules["fitz"] = MagicMock()

from services.pdf_processor import PDFProcessor

class TestPDFProcessorCleanText(unittest.TestCase):
    def setUp(self):
        self.processor = PDFProcessor()

    def test_clean_text_none(self):
        """Test that None input returns empty string."""
        self.assertEqual(self.processor.clean_text(None), "")

    def test_clean_text_empty(self):
        """Test that empty string input returns empty string."""
        self.assertEqual(self.processor.clean_text(""), "")

    def test_clean_text_artifacts(self):
        """Test removal of various artifacts."""
        # Footer artifact
        self.assertEqual(self.processor.clean_text("NotebookLM"), "")
        # Note: sub("NotebookLM", "") leaves two spaces if it was surrounded by spaces
        # "Text NotebookLM Text" -> "Text  Text" -> normalized to "Text Text" by MULTIPLE_SPACES
        self.assertEqual(self.processor.clean_text("Text NotebookLM Text"), "Text Text")

        # Case-insensitive check
        self.assertEqual(self.processor.clean_text("notebooklm"), "")
        self.assertEqual(self.processor.clean_text("NOTEBOOKLM"), "")
        self.assertEqual(self.processor.clean_text("NoTeBoOkLm"), "")

        # Citation
        self.assertEqual(self.processor.clean_text("Fact [1]"), "Fact")
        self.assertEqual(self.processor.clean_text("Fact [12]"), "Fact")

        # Page marker
        self.assertEqual(self.processor.clean_text("--- PAGE 3 ---"), "")
        # "Text --- PAGE 3 --- Text" -> "Text  Text" -> "Text Text"
        self.assertEqual(self.processor.clean_text("Text --- PAGE 3 --- Text"), "Text Text")

    def test_clean_text_page_numbers(self):
        """Test that lines with only numbers are removed."""
        # Line with only number
        self.assertEqual(self.processor.clean_text("123"), "")
        self.assertEqual(self.processor.clean_text("Text\n123\nText"), "Text\nText")

        # Line with number and spaces
        self.assertEqual(self.processor.clean_text("  123  "), "")

    def test_clean_text_whitespace(self):
        """Test whitespace normalization."""
        # Multiple spaces
        self.assertEqual(self.processor.clean_text("A   B"), "A B")

        # Multiple newlines (Note: implementation removes empty lines first)
        self.assertEqual(self.processor.clean_text("A\n\n\nB"), "A\nB")

        # Leading/Trailing whitespace
        self.assertEqual(self.processor.clean_text("  A  "), "A")

    def test_clean_text_combined(self):
        """Test a combination of cleaning operations."""
        text = "NotebookLM\n[1] Citation.\n--- PAGE 1 ---\n1\nReal Text."
        # 1. "NotebookLM" -> "" -> Empty line -> Removed.
        # 2. "[1] Citation." -> " Citation." -> Kept.
        # 3. "--- PAGE 1 ---" -> "" -> Empty line -> Removed.
        # 4. "1" -> Digit -> Removed.
        # 5. "Real Text." -> Kept.
        # Result joined: " Citation.\nReal Text."
        # Whitespace norm: " Citation.\nReal Text." (no multiple spaces)
        # Final strip: "Citation.\nReal Text."

        expected = "Citation.\nReal Text."
        self.assertEqual(self.processor.clean_text(text), expected)

if __name__ == "__main__":
    unittest.main()
