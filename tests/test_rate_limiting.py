
import os
import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone

# Set env vars before importing main to avoid config errors
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock-key"
os.environ["SUPABASE_JWT_SECRET"] = "mock-secret"

import main

class TestRateLimiting(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    @patch('main.supabase_client')
    @patch('jwt.decode')
    def test_rate_limit_exceeded(self, mock_jwt_decode, mock_supabase):
        # Mock JWT
        mock_jwt_decode.return_value = {"sub": "user-123", "role": "authenticated"}

        # Mock DB response: user has exceeded limit
        mock_user_profile = {
            "daily_requests_count": 1001,
            "last_request_time": datetime.now(timezone.utc).isoformat()
        }

        # Mock the chain: table().select().eq().single().execute()
        mock_execute = MagicMock()
        mock_execute.data = mock_user_profile

        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_execute

        # Send request with Origin header to trigger CORS
        response = self.client.get("/health", headers={
            "Authorization": "Bearer mock-token",
            "Origin": "http://localhost:3000"
        })

        # Expect 429 Too Many Requests
        self.assertEqual(response.status_code, 429)
        self.assertIn("Rate limit exceeded", response.text)

        # Verify CORS headers
        self.assertIn("access-control-allow-origin", response.headers)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")

    @patch('main.supabase_client')
    @patch('jwt.decode')
    def test_rate_limit_within_limit(self, mock_jwt_decode, mock_supabase):
        # Mock JWT
        mock_jwt_decode.return_value = {"sub": "user-123", "role": "authenticated"}

        # Mock DB response: user is within limit
        mock_user_profile = {
            "daily_requests_count": 50,
            "last_request_time": datetime.now(timezone.utc).isoformat()
        }

        # Mock the chain
        mock_execute = MagicMock()
        mock_execute.data = mock_user_profile

        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = mock_execute

        # Send request
        response = self.client.get("/health", headers={"Authorization": "Bearer mock-token"})

        # Expect 200 OK
        self.assertEqual(response.status_code, 200)

        # Verify update was called
        mock_supabase.table.return_value.update.assert_called_with({
            "daily_requests_count": 51,
            "last_request_time": unittest.mock.ANY
        })

if __name__ == '__main__':
    unittest.main()
