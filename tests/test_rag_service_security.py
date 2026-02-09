
import pytest
import os
from urllib.parse import urlparse
from unittest.mock import AsyncMock, MagicMock, patch, call
import services.rag_service as rag_service

MOCKED_SUPABASE_URL = "https://example.supabase.co"

@pytest.mark.asyncio
async def test_ssrf_mitigated():
    """
    Test that process_document_background validates the URL and prevents SSRF.
    """
    document_id = "test-doc-id"
    malicious_url = "http://internal-service/sensitive-data"

    # Save original
    original_url = rag_service.SUPABASE_URL
    rag_service.SUPABASE_URL = MOCKED_SUPABASE_URL

    try:
        mock_supabase = MagicMock()
        rag_service.supabase_admin = mock_supabase

        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_client.get.return_value = mock_response

        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None

        with patch("httpx.AsyncClient", return_value=mock_client) as mock_httpx_cls, \
             patch("services.rag_service.pdf_processor") as mock_pdf_processor, \
             patch("services.rag_service.update_document_status", new_callable=AsyncMock) as mock_update_status:

            await rag_service.process_document_background(document_id, malicious_url)

            # Verify that client.get was NOT called
            assert not mock_client.get.called, "httpx.AsyncClient.get should not be called for malicious URL"

            # Verify failure status update
            # We look for a call where status (2nd arg) is 'failed'
            failed_call_found = False
            error_message = ""

            for call_obj in mock_update_status.call_args_list:
                args, kwargs = call_obj
                # update_document_status(document_id, status, progress, error, content)
                if len(args) > 1 and args[1] == 'failed':
                    failed_call_found = True
                    # error is 4th arg (index 3)
                    if len(args) > 3:
                        error_message = args[3]
                    break

            assert failed_call_found, "Document status should be updated to 'failed'"
            assert "Security check failed" in error_message
            # The error message now contains only the domain, not the full URL
            parsed_base = urlparse(MOCKED_SUPABASE_URL)
            assert parsed_base.netloc in error_message

    finally:
        rag_service.SUPABASE_URL = original_url

@pytest.mark.asyncio
async def test_valid_url_processing():
    """
    Test that process_document_background allows valid Supabase URLs.
    """
    document_id = "valid-doc-id"
    valid_url = f"{MOCKED_SUPABASE_URL}/storage/v1/object/public/test.pdf"

    original_url = rag_service.SUPABASE_URL
    rag_service.SUPABASE_URL = MOCKED_SUPABASE_URL

    try:
        mock_supabase = MagicMock()
        rag_service.supabase_admin = mock_supabase

        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"%PDF-1.4 dummy content"
        mock_client.get.return_value = mock_response

        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None

        with patch("httpx.AsyncClient", return_value=mock_client) as mock_httpx_cls, \
             patch("services.rag_service.pdf_processor") as mock_pdf_processor, \
             patch("services.rag_service.update_document_status", new_callable=AsyncMock) as mock_update_status:

            mock_pdf_processor.process_pdf_bytes.return_value = []

            await rag_service.process_document_background(document_id, valid_url)

            # Verify client.get WAS called
            mock_client.get.assert_awaited_with(valid_url)

    finally:
        rag_service.SUPABASE_URL = original_url
