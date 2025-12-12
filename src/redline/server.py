#!/usr/bin/env python3
"""Redline MCP Server: Human-in-the-Loop review interface for AI agents.

This module implements an MCP (Model Context Protocol) server that enables
AI agents like Claude to request human feedback during execution. When the
`request_human_review` tool is called:

1. The server starts a local HTTP server (FastAPI + Uvicorn) on a dynamic port
2. A browser window opens with a React-based review interface
3. The user can highlight text and add inline comments
4. Feedback is returned as structured JSON to the AI agent

Architecture:
    Main thread: Runs the MCP server (stdio communication with Claude)
    Daemon thread: Runs the HTTP server for the web UI
    asyncio.Future: Blocks the tool call until user submits review

The threading model ensures the MCP connection stays alive during potentially
long user review sessions while the browser UI remains responsive.

Dynamic port allocation allows multiple Claude Code instances to run
simultaneously without port conflicts.

Example:
    Configure in Claude Code:
        claude mcp add redline uvx --from git+https://github.com/switchbm/claude-redline redline

    Or run directly:
        uvx --from git+https://github.com/switchbm/claude-redline redline
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import subprocess
import sys
import threading
import time
import webbrowser
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from redline.themes import (
    DEFAULT_THEME_NAME,
    get_theme,
    get_theme_descriptions,
    list_themes,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global state
app_state: dict[str, Any] = {
    "content": "",
    "future": None,
    "loop": None,  # Event loop for thread-safe future resolution
    "theme": DEFAULT_THEME_NAME,
    "base_dir": None,  # Working directory for file resolution
    "diff_data": {},  # Git diff data: {file_path: {added_lines: [], removed_lines: []}}
    "pending_review": None,  # Stores submitted review if tool call was interrupted
    "pending_review_time": None,  # Timestamp of pending review
    "http_port": None,  # Dynamically assigned HTTP server port
}

# Port configuration - now dynamic to support multiple instances
DEFAULT_PORT = 6380  # Fallback if dynamic allocation fails


def _find_free_port() -> int:
    """Find an available port for the HTTP server.

    Uses the OS to allocate a free port by binding to port 0,
    then immediately closing the socket and returning the assigned port.

    Returns:
        An available port number.
    """
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.listen(1)
        port: int = s.getsockname()[1]
    return port


# Lifespan context manager - signals when server is actually ready
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Manage FastAPI application lifespan events."""
    # Startup: signal that server is ready to accept connections
    http_server_started.set()
    logger.info("HTTP server is now accepting connections")
    yield
    # Shutdown: cleanup if needed
    logger.info("HTTP server shutting down")


# FastAPI application
app = FastAPI(title="Redline Review Server", lifespan=lifespan)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Endpoints
@app.get("/api/content")
async def get_content() -> JSONResponse:
    """Return the current markdown content for the review UI.

    The React frontend polls this endpoint to retrieve the markdown
    document that was submitted for review.

    Returns:
        JSONResponse with {"content": "<markdown string>"}
    """
    return JSONResponse({"content": app_state.get("content", "")})


@app.get("/api/config")
async def get_config() -> JSONResponse:
    """Return the current configuration including theme.

    The React frontend fetches this on startup to get the theme
    and other configuration settings.

    Returns:
        JSONResponse with {"theme": ThemeDefinition}
    """
    theme_name = app_state.get("theme", DEFAULT_THEME_NAME)
    theme = get_theme(theme_name)
    return JSONResponse(
        {
            "theme": theme,
            "available_themes": list_themes(),
        }
    )


@app.get("/api/file")
async def get_file(path: str) -> JSONResponse:
    """Return the contents of a file for the code viewer.

    Resolves the file path relative to the base_dir set during review.
    Returns the file content, language (for syntax highlighting), and line count.

    Args:
        path: Relative or absolute path to the file

    Returns:
        JSONResponse with {"content": str, "language": str, "lines": int}
        or error response if file not found
    """
    base_dir = app_state.get("base_dir")
    if not base_dir:
        base_dir = os.getcwd()

    # Resolve the file path
    file_path = Path(path)
    if not file_path.is_absolute():
        file_path = Path(base_dir) / path

    # Security: Ensure the path is within base_dir
    try:
        file_path = file_path.resolve()
        base_path = Path(base_dir).resolve()
        if not str(file_path).startswith(str(base_path)):
            return JSONResponse(
                {"error": "Access denied: path outside base directory"}, status_code=403
            )
    except Exception as e:
        return JSONResponse({"error": f"Invalid path: {e}"}, status_code=400)

    if not file_path.exists():
        return JSONResponse({"error": "File not found"}, status_code=404)

    if not file_path.is_file():
        return JSONResponse({"error": "Not a file"}, status_code=400)

    try:
        content = file_path.read_text(encoding="utf-8")
        lines = content.count("\n") + (1 if content and not content.endswith("\n") else 0)

        # Determine language from file extension
        ext_to_language = {
            ".py": "python",
            ".js": "javascript",
            ".jsx": "jsx",
            ".ts": "typescript",
            ".tsx": "tsx",
            ".rs": "rust",
            ".go": "go",
            ".java": "java",
            ".c": "c",
            ".cpp": "cpp",
            ".h": "c",
            ".hpp": "cpp",
            ".css": "css",
            ".html": "html",
            ".json": "json",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".md": "markdown",
            ".sh": "bash",
            ".sql": "sql",
            ".rb": "ruby",
            ".php": "php",
            ".swift": "swift",
            ".kt": "kotlin",
            ".scala": "scala",
            ".toml": "toml",
        }
        ext = file_path.suffix.lower()
        language = ext_to_language.get(ext, "text")

        # Get relative path for display
        try:
            rel_path = file_path.relative_to(base_path)
        except ValueError:
            rel_path = file_path

        return JSONResponse(
            {
                "content": content,
                "language": language,
                "lines": lines,
                "path": str(rel_path),
                "absolute_path": str(file_path),
            }
        )
    except UnicodeDecodeError:
        return JSONResponse({"error": "Binary file cannot be displayed"}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": f"Error reading file: {e}"}, status_code=500)


@app.get("/api/diff")
async def get_diff() -> JSONResponse:
    """Return the git diff data for highlighting changed lines.

    Returns the diff_data stored in app_state, which contains information
    about added and removed lines for each file.

    Returns:
        JSONResponse with diff data structure
    """
    return JSONResponse({"diff": app_state.get("diff_data", {})})


def parse_git_diff(base_dir: str) -> dict[str, dict[str, list[int]]]:
    """Parse git diff to identify added and removed lines.

    Runs `git diff HEAD` in the base directory and parses the output
    to identify which lines were added or removed in each file.

    Args:
        base_dir: Directory to run git diff in

    Returns:
        Dict mapping file paths to {"added_lines": [...], "removed_lines": [...]}
    """
    diff_data: dict[str, dict[str, list[int]]] = {}

    try:
        # Get the diff output
        result = subprocess.run(
            ["git", "diff", "HEAD"], cwd=base_dir, capture_output=True, text=True, timeout=30
        )

        if result.returncode != 0:
            logger.warning(f"git diff failed: {result.stderr}")
            return diff_data

        current_file = None
        current_line_old = 0
        current_line_new = 0

        for line in result.stdout.split("\n"):
            # New file header
            if line.startswith("+++ b/"):
                current_file = line[6:]  # Remove "+++ b/" prefix
                diff_data[current_file] = {"added_lines": [], "removed_lines": []}

            # Hunk header: @@ -old_start,old_count +new_start,new_count @@
            elif line.startswith("@@"):
                # Parse the line numbers
                parts = line.split(" ")
                for part in parts:
                    if part.startswith("+") and "," in part:
                        current_line_new = int(part[1:].split(",")[0])
                    elif part.startswith("+") and part[1:].isdigit():
                        current_line_new = int(part[1:])

            # Added line
            elif line.startswith("+") and not line.startswith("+++"):
                if current_file and current_file in diff_data:
                    diff_data[current_file]["added_lines"].append(current_line_new)
                current_line_new += 1

            # Removed line (we track these but they don't exist in the current file)
            elif line.startswith("-") and not line.startswith("---"):
                if current_file and current_file in diff_data:
                    diff_data[current_file]["removed_lines"].append(current_line_old)
                current_line_old += 1

            # Context line (unchanged)
            elif not line.startswith("\\"):
                current_line_new += 1
                current_line_old += 1

    except subprocess.TimeoutExpired:
        logger.warning("git diff timed out")
    except Exception as e:
        logger.warning(f"Error parsing git diff: {e}")

    return diff_data


@app.post("/api/submit")
async def submit_review(data: dict[str, Any]) -> JSONResponse:
    """Accept the user's review submission and unblock the MCP tool call.

    This endpoint receives the user's feedback from the React UI and resolves
    the asyncio.Future that the `request_human_review` tool is awaiting.

    If the tool call was interrupted, the review is stored as pending and can
    be retrieved on the next tool invocation.

    Args:
        data: Review payload containing:
            - comments: List of inline comments with quote, text, timestamp
            - user_overall_comment: Optional summary comment

    Returns:
        JSONResponse with {"status": "ok"}
    """
    num_comments = len(data.get("comments", []))
    overall_comment = data.get("user_overall_comment")

    if overall_comment == "LGTM" and num_comments == 0:
        logger.info("Review submitted: LGTM (approved with no comments)")
    elif num_comments == 0 and not overall_comment:
        logger.info("Review submitted: Approved with no comments")
    elif overall_comment:
        logger.info(
            f"Review submitted with {num_comments} inline comments "
            f"and overall comment: '{overall_comment}'"
        )
    else:
        logger.info(f"Review submitted with {num_comments} inline comments")

    # Always store the review as pending (in case tool call is interrupted)
    app_state["pending_review"] = data
    app_state["pending_review_time"] = time.time()

    # Resolve the future with the submitted data (thread-safe)
    future = app_state.get("future")
    loop = app_state.get("loop")
    if future and isinstance(future, asyncio.Future) and not future.done():
        if loop and loop.is_running():
            # Production: called from HTTP thread, use thread-safe method
            loop.call_soon_threadsafe(future.set_result, data)
        else:
            # Tests or same-thread: direct call is safe
            future.set_result(data)

    return JSONResponse({"status": "ok"})


# Mount static files
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
else:
    logger.warning(f"Static directory not found: {static_dir}")
    logger.warning("Run 'python build_ui.py' to build the frontend assets")


# HTTP Server Thread
http_server_thread: threading.Thread | None = None
http_server_started = threading.Event()


def run_http_server() -> None:
    """Run the FastAPI/Uvicorn HTTP server in a daemon thread.

    Binds to 127.0.0.1 on the dynamically allocated port (localhost only for security).
    Sets the http_server_started event when ready to accept connections.
    """
    port = app_state.get("http_port", DEFAULT_PORT)
    try:
        logger.info(f"Starting HTTP server on port {port}")
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=port,
            log_level="info",
            access_log=False,
        )
        server = uvicorn.Server(config)
        # Note: http_server_started is set by the FastAPI startup event
        server.run()
    except Exception as e:
        logger.error(f"HTTP server error: {e}")


def start_http_server_if_needed() -> int:
    """Start the HTTP server in a background thread if not already running.

    Creates a daemon thread so the server automatically stops when the
    main process exits. Waits up to 5 seconds for the server to be ready.
    Allocates a dynamic port to support multiple concurrent instances.

    Returns:
        The port number the HTTP server is running on.
    """
    global http_server_thread

    if http_server_thread is None or not http_server_thread.is_alive():
        # Allocate a free port for this instance
        port = _find_free_port()
        app_state["http_port"] = port

        http_server_thread = threading.Thread(
            target=run_http_server, daemon=True, name="HTTPServerThread"
        )
        http_server_thread.start()
        # Wait for server to start
        http_server_started.wait(timeout=5)
        logger.info(f"HTTP server thread started on port {port}")

    return int(app_state.get("http_port", DEFAULT_PORT))


# MCP Server
mcp_server = Server("redline")


@mcp_server.list_tools()
async def list_tools() -> list[Tool]:
    """Return the list of tools available from this MCP server.

    Returns:
        List containing the `request_human_review` tool definition.
    """
    return [
        Tool(
            name="request_human_review",
            description=(
                "# Redline Review Tool\n\n"
                "Request human review via browser interface for interactive feedback with highlighting and comments.\n\n"
                "## WHEN TO USE THIS TOOL\n\n"
                "**ALWAYS use this tool when:**\n\n"
                "1. **Code Reviews & PR Analysis** - When reviewing pull requests, analyzing code changes, or providing "
                "feedback on implementations. Present your findings so the user can highlight concerns and add comments "
                "on specific sections.\n\n"
                "2. **Technical Analysis Deliverables** - When providing substantive technical analysis (architectural "
                "review, performance analysis, security audit, trade-off analysis) that exceeds 200 words or contains "
                "multiple distinct findings.\n\n"
                "3. **Implementation Plans** - Before implementing complex changes, present the plan for approval. User "
                "can mark sections as approved, needs-revision, or add clarifying questions.\n\n"
                "4. **Phase Completion Summaries** - After completing a significant phase of work (especially when "
                "marking 3+ todos as completed), present a walkthrough of what was done for review and sign-off. "
                "This allows users to review all changes in one structured document with clickable code references.\n\n"
                "5. **Recommendations with Options** - When presenting multiple approaches or recommendations where the "
                "user needs to make decisions. They can annotate preferences directly on each option.\n\n"
                "6. **Explicit Requests** - When user asks for a 'redline', 'redline document', 'review document', "
                "'present for review', or 'create a document for review'.\n\n"
                "**DO NOT use this tool for:**\n"
                "- Simple Q&A responses\n"
                "- Short clarifications or explanations\n"
                "- Status updates under 200 words\n"
                "- Single, straightforward task completions\n"
                "- When user explicitly asks for inline/chat response\n\n"
                "## DEFAULT MINDSET\n\n"
                "**When in doubt, use redline.** It's better to provide interactive review capability for substantial "
                "content than to present it as plain text. Users can always read it linearly if they prefer, but redline "
                "gives them the option to highlight sections, add contextual comments, and click through to code. "
                "Redline makes technical content more actionable.\n\n"
                "## FORMATTING BEST PRACTICES\n\n"
                "Structure your markdown for easy annotation:\n"
                "- Use clear **## Section Headers** so users can comment on specific sections\n"
                "- Use **numbered lists** for recommendations/findings (easier to reference: 'I disagree with point 3')\n"
                "- Use **tables** for comparisons and trade-offs\n"
                "- Include **code references** using `[[file:path/to/file.py:42]]` or `[[file:path/to/file.py:42-50]]` "
                "format for clickable links to specific lines or ranges\n"
                "- Keep paragraphs focused on single topics (one concern = one paragraph)\n"
                "- Use `> blockquotes` for key findings or warnings that deserve attention\n\n"
                "## CONTEXT PARAMETER\n\n"
                "Always provide a clear context string describing what the user is reviewing:\n"
                "- ✅ 'Phase 2 Complete: API Integration Summary'\n"
                "- ✅ 'PR #1234: Authentication Refactor Review'\n"
                "- ✅ 'Implementation Plan: Cache Strategy Options'\n"
                "- ❌ 'Review' (too vague)\n"
                "- ❌ 'Summary' (lacks specificity)\n\n"
                "## EXAMPLE TRIGGER SCENARIOS\n\n"
                "| User Request | Action |\n"
                "|--------------|--------|\n"
                "| 'Review this PR' | USE REDLINE - code review analysis |\n"
                "| 'What does this function do?' | NO - simple explanation |\n"
                "| 'Analyze the performance implications' | USE REDLINE - technical analysis |\n"
                "| 'Is this approach correct?' | DEPENDS - use if answer is substantive |\n"
                "| 'Create a summary of changes' | USE REDLINE - deliverable document |\n"
                "| 'Help me understand X' | NO - educational response |\n"
                "| 'What are the risks?' | USE REDLINE - analysis with findings |"
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "markdown_spec": {
                        "type": "string",
                        "description": (
                            "The markdown document to review. Use code references [[file:path:line]] "
                            "to link to specific code. Examples:\n"
                            "- [[file:src/auth.py:42]] - links to line 42\n"
                            "- [[file:src/auth.py:42-50]] - links to lines 42-50\n"
                            "- [[file:README.md]] - links to entire file\n"
                            "These become clickable buttons that open a code viewer panel."
                        ),
                    },
                    "context": {
                        "type": "string",
                        "description": "What to review. Examples: 'Implementation plan for feature X', 'Phase 1 completion summary', 'Architecture decision'",
                    },
                    "base_dir": {
                        "type": "string",
                        "description": "Base directory for resolving file references. Defaults to current working directory.",
                    },
                },
                "required": ["markdown_spec"],
            },
        )
    ]


# Time window (in seconds) to consider a pending review as valid
PENDING_REVIEW_WINDOW = 5 * 60  # 5 minutes


@mcp_server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle MCP tool invocations from Claude.

    For `request_human_review`:
    1. Checks for pending review from interrupted tool call
    2. If no pending review, stores markdown and waits for user submission
    3. Returns the feedback as JSON

    Args:
        name: Tool name (must be "request_human_review")
        arguments: Dict with "markdown_spec" and optional "context"

    Returns:
        List with single TextContent containing JSON feedback

    Raises:
        ValueError: If tool name is not recognized
    """
    if name != "request_human_review":
        raise ValueError(f"Unknown tool: {name}")

    markdown_spec = arguments.get("markdown_spec", "")
    context = arguments.get("context", "")
    base_dir = arguments.get("base_dir", os.getcwd())

    logger.info("Human review requested")
    logger.info(f"Context: {context}")
    logger.info(f"Base directory: {base_dir}")

    # Check for pending review from interrupted tool call
    pending_review = app_state.get("pending_review")
    pending_time = app_state.get("pending_review_time")
    if pending_review and pending_time:
        age = time.time() - pending_time
        if age < PENDING_REVIEW_WINDOW:
            logger.info(f"Found pending review from {age:.1f}s ago, returning it")
            # Clear the pending review
            app_state["pending_review"] = None
            app_state["pending_review_time"] = None
            return [TextContent(type="text", text=json.dumps(pending_review, indent=2))]
        else:
            logger.info(f"Pending review is too old ({age:.1f}s), ignoring")
            app_state["pending_review"] = None
            app_state["pending_review_time"] = None

    # Update global state with new content and base_dir
    app_state["content"] = markdown_spec
    app_state["base_dir"] = base_dir

    # Parse git diff for the base directory
    app_state["diff_data"] = parse_git_diff(base_dir)
    logger.info(f"Parsed diff data for {len(app_state['diff_data'])} files")

    # Create a new future to wait for the review
    loop = asyncio.get_event_loop()
    future: asyncio.Future[Any] = loop.create_future()
    app_state["future"] = future
    app_state["loop"] = loop  # Store loop for thread-safe resolution

    # Start HTTP server if not running (returns the allocated port)
    port = start_http_server_if_needed()

    # Open browser to the review interface
    url = f"http://localhost:{port}"
    logger.info(f"Opening browser to {url}")
    try:
        webbrowser.open(url)
    except Exception as e:
        logger.error(f"Failed to open browser: {e}")

    # Wait indefinitely for the user to submit their review (no timeout)
    logger.info("Waiting for user review (no timeout - take as long as you need)...")
    result = await future

    logger.info("Review received!")

    # Return the structured feedback
    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def async_main() -> None:
    """Main async entry point for the MCP server.

    Establishes stdio communication with Claude and runs the MCP server
    until the connection is closed or an error occurs.
    """
    logger.info("Starting Redline MCP Server")

    async with stdio_server() as (read_stream, write_stream):
        await mcp_server.run(read_stream, write_stream, mcp_server.create_initialization_options())


def create_argument_parser() -> argparse.ArgumentParser:
    """Create the command-line argument parser.

    Returns:
        Configured ArgumentParser instance
    """
    parser = argparse.ArgumentParser(
        prog="redline",
        description="Redline MCP Server: Human-in-the-Loop review interface for AI agents",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uvx redline                     # Use default theme
  uvx redline --theme dark        # Use dark theme
  uvx redline --theme ocean       # Use ocean theme
  uvx redline --list-themes       # Show available themes

Available themes:
"""
        + "\n".join(f"  {name}: {desc}" for name, desc in get_theme_descriptions().items()),
    )

    parser.add_argument(
        "--theme",
        "-t",
        type=str,
        default=DEFAULT_THEME_NAME,
        metavar="NAME",
        help=f"UI theme to use (default: {DEFAULT_THEME_NAME})",
    )

    parser.add_argument(
        "--list-themes",
        action="store_true",
        help="List available themes and exit",
    )

    return parser


def main() -> None:
    """Main entry point for the Redline MCP server.

    Called when running `redline` from the command line or `uvx redline`.
    Handles KeyboardInterrupt gracefully and logs any errors.

    Command-line arguments:
        --theme, -t NAME: Set the UI theme (default: default)
        --list-themes: Show available themes and exit
    """
    parser = create_argument_parser()
    args = parser.parse_args()

    # Handle --list-themes
    if args.list_themes:
        print("Available themes:")
        for name, desc in sorted(get_theme_descriptions().items()):
            print(f"  {name}: {desc}")
        sys.exit(0)

    # Validate and set theme
    try:
        get_theme(args.theme)  # Validate theme exists
        app_state["theme"] = args.theme.lower()
        logger.info(f"Using theme: {args.theme}")
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
