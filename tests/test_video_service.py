import sys
from unittest.mock import MagicMock

# Mock missing dependencies before they are imported
sys.modules["fitz"] = MagicMock()
sys.modules["fastapi"] = MagicMock()
sys.modules["httpx"] = MagicMock()
sys.modules["config"] = MagicMock()
sys.modules["schemas"] = MagicMock()
sys.modules["services.ai_utils"] = MagicMock()

import pytest
from services.video_service import parse_iso8601_duration

def test_parse_iso8601_duration_empty():
    assert parse_iso8601_duration("") == "0:00"
    assert parse_iso8601_duration(None) == "0:00"

def test_parse_iso8601_duration_invalid():
    assert parse_iso8601_duration("invalid") == "0:00"
    assert parse_iso8601_duration("12M30S") == "0:00"  # Missing PT

def test_parse_iso8601_duration_seconds():
    assert parse_iso8601_duration("PT30S") == "0:30"
    assert parse_iso8601_duration("PT5S") == "0:05"

def test_parse_iso8601_duration_minutes():
    assert parse_iso8601_duration("PT15M") == "15:00"
    assert parse_iso8601_duration("PT5M") == "5:00"

def test_parse_iso8601_duration_hours():
    assert parse_iso8601_duration("PT1H") == "1:00:00"
    assert parse_iso8601_duration("PT10H") == "10:00:00"

def test_parse_iso8601_duration_combinations():
    assert parse_iso8601_duration("PT15M30S") == "15:30"
    assert parse_iso8601_duration("PT1H2M3S") == "1:02:03"
    assert parse_iso8601_duration("PT1H30S") == "1:00:30"
    assert parse_iso8601_duration("PT1H5M") == "1:05:00"

def test_parse_iso8601_duration_large_values():
    # YouTube sometimes has long videos
    assert parse_iso8601_duration("PT25H") == "25:00:00"
    assert parse_iso8601_duration("PT100H") == "100:00:00"

def test_parse_iso8601_duration_zero_values():
    assert parse_iso8601_duration("PT0S") == "0:00"
    assert parse_iso8601_duration("PT0M") == "0:00"
    assert parse_iso8601_duration("PT0H") == "0:00"
    assert parse_iso8601_duration("PT0H0M0S") == "0:00"
