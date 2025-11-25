"""Tests for the Redline MCP server."""

import asyncio
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from redline.server import (
    app,
    app_state,
    call_tool,
    get_content,
    list_tools,
    run_http_server,
    start_http_server_if_needed,
    submit_review,
)


@pytest.fixture
def client() -> TestClient:
    """Create a test client."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_app_state() -> None:
    """Reset app state before each test."""
    app_state["content"] = ""
    app_state["future"] = None


class TestAPIEndpoints:
    """Tests for FastAPI endpoints."""

    def test_get_content_empty(self, client: TestClient) -> None:
        """Test getting content when empty."""
        response = client.get("/api/content")
        assert response.status_code == 200
        assert response.json() == {"content": ""}

    def test_get_content_with_data(self, client: TestClient) -> None:
        """Test getting content when data exists."""
        app_state["content"] = "# Test Document"
        response = client.get("/api/content")
        assert response.status_code == 200
        assert response.json() == {"content": "# Test Document"}

    def test_submit_review_lgtm(self, client: TestClient) -> None:
        """Test submitting a review with LGTM and no comments."""
        # Create a future to be resolved
        loop = asyncio.new_event_loop()
        future = loop.create_future()
        app_state["future"] = future

        payload = {"comments": [], "user_overall_comment": "LGTM"}

        response = client.post("/api/submit", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert future.done()
        assert future.result() == payload

        loop.close()

    def test_submit_review_with_comments(self, client: TestClient) -> None:
        """Test submitting a review with inline comments."""
        loop = asyncio.new_event_loop()
        future = loop.create_future()
        app_state["future"] = future

        payload = {
            "comments": [
                {
                    "id": "123",
                    "quote": "test",
                    "full_line_text": "this is a test line",
                    "user_comment": "needs clarification",
                    "timestamp": 1234567890,
                }
            ],
            "user_overall_comment": "Overall good",
        }

        response = client.post("/api/submit", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert future.done()
        assert future.result() == payload

        loop.close()

    def test_submit_review_no_future(self, client: TestClient) -> None:
        """Test submitting when no future exists."""
        payload = {"comments": [], "user_overall_comment": None}
        response = client.post("/api/submit", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestMCPTools:
    """Tests for MCP tool functionality."""

    async def test_list_tools(self) -> None:
        """Test listing available tools."""
        tools = await list_tools()
        assert len(tools) == 1
        assert tools[0].name == "request_human_review"
        assert "REQUIRED" in tools[0].description
        assert "markdown_spec" in tools[0].inputSchema["properties"]

    @patch("redline.server.webbrowser.open")
    @patch("redline.server.start_http_server_if_needed")
    async def test_call_tool_request_human_review(
        self, mock_start_server: MagicMock, mock_browser: MagicMock
    ) -> None:
        """Test calling the request_human_review tool."""
        markdown_spec = "# Test Document\nThis is a test."
        context = "Please review this"

        result_data = {
            "comments": [
                {
                    "id": "1",
                    "quote": "test",
                    "full_line_text": "This is a test.",
                    "user_comment": "LGTM",
                    "timestamp": 123456,
                }
            ],
            "user_overall_comment": "Approved",
        }

        # Create an async function to simulate the tool call
        async def run_tool() -> Any:
            return await call_tool(
                "request_human_review",
                {"markdown_spec": markdown_spec, "context": context},
            )

        # Start the tool call
        task = asyncio.create_task(run_tool())

        # Wait briefly for setup
        await asyncio.sleep(0.05)

        # Resolve the future
        future = app_state.get("future")
        assert isinstance(future, asyncio.Future)
        future.set_result(result_data)

        # Get the result
        result = await task

        # Verify the result
        assert len(result) == 1
        assert result[0].type == "text"
        assert "comments" in result[0].text
        assert "Approved" in result[0].text

        # Verify browser was opened
        mock_browser.assert_called_once_with("http://localhost:6380")

        # Verify server start was called
        mock_start_server.assert_called_once()

        # Verify content was set
        assert app_state["content"] == markdown_spec

    async def test_call_tool_invalid_name(self) -> None:
        """Test calling a tool with invalid name."""
        with pytest.raises(ValueError, match="Unknown tool"):
            await call_tool("invalid_tool", {})


class TestHTTPServerManagement:
    """Tests for HTTP server thread management."""

    def test_run_http_server_error_handling(self) -> None:
        """Test that run_http_server handles exceptions."""
        with patch("redline.server.uvicorn.Server") as mock_server:
            mock_instance = MagicMock()
            mock_instance.run.side_effect = Exception("Test error")
            mock_server.return_value = mock_instance

            # Should not raise, just log
            run_http_server()

    @patch("redline.server.threading.Thread")
    def test_start_http_server_if_needed_starts_new_thread(
        self, mock_thread_class: MagicMock
    ) -> None:
        """Test starting a new HTTP server thread."""
        # Mock the thread
        mock_thread = MagicMock()
        mock_thread.is_alive.return_value = False
        mock_thread_class.return_value = mock_thread

        # Patch the global
        import redline.server

        redline.server.http_server_thread = None

        with patch("redline.server.http_server_started") as mock_event:
            start_http_server_if_needed()

            # Thread should be created
            mock_thread_class.assert_called_once()
            mock_thread.start.assert_called_once()
            mock_event.wait.assert_called_once_with(timeout=5)


class TestEdgeCases:
    """Tests for edge cases and error conditions."""

    async def test_submit_review_with_completed_future(self) -> None:
        """Test submitting when future is already done."""
        loop = asyncio.new_event_loop()
        future = loop.create_future()
        future.set_result({"test": "data"})
        app_state["future"] = future

        # Submit should not raise even though future is done
        result = await submit_review({"comments": [], "user_overall_comment": None})
        assert result.status_code == 200

        loop.close()

    async def test_get_content_returns_json_response(self) -> None:
        """Test that get_content returns proper JSONResponse."""
        result = await get_content()
        assert hasattr(result, "status_code")
        assert result.status_code == 200

    def test_app_state_structure(self) -> None:
        """Test that app_state has the correct structure."""
        assert "content" in app_state
        assert "future" in app_state
        assert isinstance(app_state["content"], str)
