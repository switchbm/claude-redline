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
    get_config,
    get_content,
    get_diff,
    get_file,
    list_tools,
    parse_git_diff,
    run_http_server,
    start_http_server_if_needed,
    submit_review,
)
from redline.themes import (
    DEFAULT_THEME_NAME,
    get_theme,
    get_theme_descriptions,
    list_themes,
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
    app_state["loop"] = None
    app_state["theme"] = DEFAULT_THEME_NAME
    app_state["base_dir"] = None
    app_state["diff_data"] = {}


class TestThemes:
    """Tests for theme functionality."""

    def test_list_themes(self) -> None:
        """Test listing available themes."""
        themes = list_themes()
        assert "clean" in themes
        assert "dark" in themes
        assert "forest" in themes
        assert "ocean" in themes
        assert "sunset" in themes
        assert "minimal" in themes
        assert len(themes) == 6

    def test_get_theme_clean(self) -> None:
        """Test getting the clean theme."""
        theme = get_theme("clean")
        assert theme["name"] == "clean"
        assert "description" in theme
        assert "colors" in theme
        assert "bg_page" in theme["colors"]
        assert "accent_primary" in theme["colors"]

    def test_get_theme_dark(self) -> None:
        """Test getting the dark theme."""
        theme = get_theme("dark")
        assert theme["name"] == "dark"
        assert theme["colors"]["bg_page"] == "#0f172a"

    def test_get_theme_case_insensitive(self) -> None:
        """Test that theme names are case-insensitive."""
        theme1 = get_theme("DARK")
        theme2 = get_theme("Dark")
        theme3 = get_theme("dark")
        assert theme1 == theme2 == theme3

    def test_get_theme_invalid(self) -> None:
        """Test getting an invalid theme raises ValueError."""
        with pytest.raises(ValueError, match="Unknown theme"):
            get_theme("nonexistent")

    def test_get_theme_descriptions(self) -> None:
        """Test getting theme descriptions."""
        descriptions = get_theme_descriptions()
        assert len(descriptions) == 6
        assert "clean" in descriptions
        assert "professional" in descriptions["clean"].lower()

    def test_all_themes_have_required_colors(self) -> None:
        """Test that all themes have all required color keys."""
        required_colors = [
            "bg_page", "bg_card", "bg_card_hover", "bg_input", "bg_code",
            "bg_highlight", "bg_highlight_hover", "text_primary", "text_secondary",
            "text_muted", "text_inverse", "accent_primary", "accent_primary_hover",
            "accent_secondary", "accent_success", "accent_error", "accent_warning",
            "border_default", "border_light", "border_accent",
            "shadow_sm", "shadow_md", "shadow_lg",
        ]
        for theme_name in list_themes():
            theme = get_theme(theme_name)
            for color_key in required_colors:
                assert color_key in theme["colors"], (
                    f"Theme '{theme_name}' missing color '{color_key}'"
                )


class TestConfigEndpoint:
    """Tests for the /api/config endpoint."""

    def test_get_config_default_theme(self, client: TestClient) -> None:
        """Test getting config with default theme (dark)."""
        response = client.get("/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "theme" in data
        assert data["theme"]["name"] == "dark"
        assert "available_themes" in data
        assert len(data["available_themes"]) == 6

    def test_get_config_with_custom_theme(self, client: TestClient) -> None:
        """Test getting config with a custom theme set."""
        app_state["theme"] = "dark"
        response = client.get("/api/config")
        assert response.status_code == 200
        data = response.json()
        assert data["theme"]["name"] == "dark"

    async def test_get_config_returns_json_response(self) -> None:
        """Test that get_config returns proper JSONResponse."""
        result = await get_config()
        assert hasattr(result, "status_code")
        assert result.status_code == 200


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
        assert "Redline Review Tool" in tools[0].description
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
        assert "base_dir" in app_state
        assert "diff_data" in app_state
        assert isinstance(app_state["content"], str)


class TestFileEndpoint:
    """Tests for the /api/file endpoint."""

    def test_get_file_not_found(self, client: TestClient) -> None:
        """Test getting a file that doesn't exist."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            app_state["base_dir"] = tmpdir
            response = client.get("/api/file?path=nonexistent.py")
            assert response.status_code == 404
            assert "not found" in response.json()["error"].lower()

    def test_get_file_success(self, client: TestClient) -> None:
        """Test getting a file successfully."""
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            app_state["base_dir"] = tmpdir
            # Create a test file
            test_file = os.path.join(tmpdir, "test.py")
            with open(test_file, "w") as f:
                f.write("print('hello')\n")

            response = client.get("/api/file?path=test.py")
            assert response.status_code == 200
            data = response.json()
            assert data["content"] == "print('hello')\n"
            assert data["language"] == "python"
            assert data["lines"] == 1
            assert data["path"] == "test.py"

    def test_get_file_path_outside_base_dir(self, client: TestClient) -> None:
        """Test that accessing files outside base_dir is forbidden."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            app_state["base_dir"] = tmpdir
            # Try to access parent directory
            response = client.get("/api/file?path=../../../etc/passwd")
            assert response.status_code == 403
            assert "outside base directory" in response.json()["error"].lower()

    def test_get_file_binary(self, client: TestClient) -> None:
        """Test getting a binary file returns error."""
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            app_state["base_dir"] = tmpdir
            # Create a binary file
            test_file = os.path.join(tmpdir, "test.bin")
            with open(test_file, "wb") as f:
                f.write(b"\x00\x01\x02\xff\xfe")

            response = client.get("/api/file?path=test.bin")
            assert response.status_code == 400
            assert "binary" in response.json()["error"].lower()

    def test_get_file_not_a_file(self, client: TestClient) -> None:
        """Test getting a directory returns error."""
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            app_state["base_dir"] = tmpdir
            # Create a subdirectory
            subdir = os.path.join(tmpdir, "subdir")
            os.makedirs(subdir)

            response = client.get("/api/file?path=subdir")
            assert response.status_code == 400
            assert "not a file" in response.json()["error"].lower()

    def test_get_file_language_detection(self, client: TestClient) -> None:
        """Test language detection from file extensions."""
        import os
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            app_state["base_dir"] = tmpdir

            test_cases = [
                ("test.ts", "typescript"),
                ("test.tsx", "tsx"),
                ("test.js", "javascript"),
                ("test.rs", "rust"),
                ("test.go", "go"),
                ("test.unknown", "text"),
            ]

            for filename, expected_lang in test_cases:
                test_file = os.path.join(tmpdir, filename)
                with open(test_file, "w") as f:
                    f.write("// code\n")

                response = client.get(f"/api/file?path={filename}")
                assert response.status_code == 200
                assert response.json()["language"] == expected_lang

    async def test_get_file_no_base_dir_uses_cwd(self) -> None:
        """Test that get_file uses cwd when base_dir is None."""

        app_state["base_dir"] = None
        # This should use os.getcwd() as the base directory
        result = await get_file("nonexistent_file_12345.py")
        assert result.status_code == 404


class TestDiffEndpoint:
    """Tests for the /api/diff endpoint."""

    def test_get_diff_empty(self, client: TestClient) -> None:
        """Test getting diff when no diff data exists."""
        response = client.get("/api/diff")
        assert response.status_code == 200
        assert response.json() == {"diff": {}}

    def test_get_diff_with_data(self, client: TestClient) -> None:
        """Test getting diff when diff data exists."""
        app_state["diff_data"] = {
            "src/test.py": {
                "added_lines": [10, 11, 12],
                "removed_lines": [5],
            }
        }
        response = client.get("/api/diff")
        assert response.status_code == 200
        data = response.json()
        assert "src/test.py" in data["diff"]
        assert data["diff"]["src/test.py"]["added_lines"] == [10, 11, 12]

    async def test_get_diff_returns_json_response(self) -> None:
        """Test that get_diff returns proper JSONResponse."""
        result = await get_diff()
        assert hasattr(result, "status_code")
        assert result.status_code == 200


class TestParseGitDiff:
    """Tests for the parse_git_diff function."""

    def test_parse_git_diff_no_git_repo(self) -> None:
        """Test parsing diff in a non-git directory."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            result = parse_git_diff(tmpdir)
            # Should return empty dict, not raise
            assert result == {}

    def test_parse_git_diff_with_mock(self) -> None:
        """Test parsing a mocked git diff output."""
        mock_diff = """diff --git a/src/test.py b/src/test.py
index abc123..def456 100644
--- a/src/test.py
+++ b/src/test.py
@@ -1,3 +2,5 @@
 unchanged line
+added line 1
+added line 2
 another unchanged
-removed line
 final line
"""
        with patch("redline.server.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=0,
                stdout=mock_diff,
                stderr=""
            )

            result = parse_git_diff("/some/path")

            assert "src/test.py" in result
            # Line 3 and 4 are added (after @@ +2,5 and counting)
            assert 3 in result["src/test.py"]["added_lines"]
            assert 4 in result["src/test.py"]["added_lines"]

    def test_parse_git_diff_timeout(self) -> None:
        """Test handling of git diff timeout."""
        import subprocess

        with patch("redline.server.subprocess.run") as mock_run:
            mock_run.side_effect = subprocess.TimeoutExpired("git", 30)

            result = parse_git_diff("/some/path")
            assert result == {}

    def test_parse_git_diff_error(self) -> None:
        """Test handling of git diff error."""
        with patch("redline.server.subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(
                returncode=1,
                stdout="",
                stderr="fatal: not a git repository"
            )

            result = parse_git_diff("/some/path")
            assert result == {}


class TestCodeComments:
    """Tests for code comment functionality."""

    def test_submit_review_with_code_comments(self, client: TestClient) -> None:
        """Test submitting a review with code comments."""
        loop = asyncio.new_event_loop()
        future = loop.create_future()
        app_state["future"] = future
        app_state["loop"] = loop

        payload = {
            "comments": [],
            "code_comments": [
                {
                    "id": "code-123",
                    "file_path": "src/test.py",
                    "line_start": 10,
                    "line_end": 15,
                    "quote": "def test_function():",
                    "user_comment": "Consider adding docstring",
                    "timestamp": 1234567890,
                }
            ],
            "user_overall_comment": "Good code, minor suggestions",
        }

        response = client.post("/api/submit", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert future.done()
        result = future.result()
        assert "code_comments" in result
        assert len(result["code_comments"]) == 1
        assert result["code_comments"][0]["file_path"] == "src/test.py"
        assert result["code_comments"][0]["line_start"] == 10

        loop.close()

    def test_submit_review_with_both_comment_types(self, client: TestClient) -> None:
        """Test submitting a review with both document and code comments."""
        loop = asyncio.new_event_loop()
        future = loop.create_future()
        app_state["future"] = future
        app_state["loop"] = loop

        payload = {
            "comments": [
                {
                    "id": "doc-123",
                    "quote": "test phrase",
                    "full_line_text": "this is a test phrase in the doc",
                    "user_comment": "clarify this",
                    "timestamp": 1234567890,
                    "context": "surrounding text for test phrase context",
                }
            ],
            "code_comments": [
                {
                    "id": "code-456",
                    "file_path": "src/main.py",
                    "line_start": 42,
                    "line_end": 42,
                    "quote": "x = y + z",
                    "user_comment": "Consider using descriptive variable names",
                    "timestamp": 1234567891,
                }
            ],
            "user_overall_comment": "Review complete",
        }

        response = client.post("/api/submit", json=payload)
        assert response.status_code == 200
        result = future.result()
        assert len(result["comments"]) == 1
        assert len(result["code_comments"]) == 1
        assert result["comments"][0]["context"] == "surrounding text for test phrase context"
        assert result["code_comments"][0]["line_start"] == 42

        loop.close()

    def test_submit_review_empty_code_comments(self, client: TestClient) -> None:
        """Test submitting with empty code_comments array."""
        loop = asyncio.new_event_loop()
        future = loop.create_future()
        app_state["future"] = future
        app_state["loop"] = loop

        payload = {
            "comments": [],
            "code_comments": [],
            "user_overall_comment": "LGTM",
        }

        response = client.post("/api/submit", json=payload)
        assert response.status_code == 200
        result = future.result()
        assert result["code_comments"] == []

        loop.close()

    def test_submit_review_multiline_code_comment(self, client: TestClient) -> None:
        """Test submitting a code comment spanning multiple lines."""
        loop = asyncio.new_event_loop()
        future = loop.create_future()
        app_state["future"] = future
        app_state["loop"] = loop

        payload = {
            "comments": [],
            "code_comments": [
                {
                    "id": "multi-line-123",
                    "file_path": "src/utils.py",
                    "line_start": 100,
                    "line_end": 150,
                    "quote": "class MyClass:\n    def __init__(self):\n        pass",
                    "user_comment": "This class needs refactoring",
                    "timestamp": 1234567890,
                }
            ],
            "user_overall_comment": None,
        }

        response = client.post("/api/submit", json=payload)
        assert response.status_code == 200
        result = future.result()
        assert result["code_comments"][0]["line_start"] == 100
        assert result["code_comments"][0]["line_end"] == 150

        loop.close()


class TestMCPToolsWithBaseDir:
    """Tests for MCP tool functionality with base_dir parameter."""

    @patch("redline.server.webbrowser.open")
    @patch("redline.server.start_http_server_if_needed")
    @patch("redline.server.parse_git_diff")
    async def test_call_tool_sets_base_dir(
        self,
        mock_parse_diff: MagicMock,
        mock_start_server: MagicMock,
        mock_browser: MagicMock
    ) -> None:
        """Test that call_tool sets base_dir correctly."""
        mock_parse_diff.return_value = {"test.py": {"added_lines": [1], "removed_lines": []}}

        async def run_tool() -> Any:
            return await call_tool(
                "request_human_review",
                {
                    "markdown_spec": "# Test",
                    "base_dir": "/custom/path",
                },
            )

        task = asyncio.create_task(run_tool())
        await asyncio.sleep(0.05)

        # Verify base_dir was set
        assert app_state["base_dir"] == "/custom/path"

        # Verify parse_git_diff was called with base_dir
        mock_parse_diff.assert_called_once_with("/custom/path")

        # Verify diff_data was set
        assert app_state["diff_data"] == {"test.py": {"added_lines": [1], "removed_lines": []}}

        # Clean up
        future = app_state.get("future")
        if future and not future.done():
            future.set_result({"comments": [], "user_overall_comment": "LGTM"})
        await task
