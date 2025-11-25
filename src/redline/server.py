#!/usr/bin/env python3
"""Redline MCP Server: Human-in-the-Loop review interface for AI agents.

This module implements an MCP (Model Context Protocol) server that enables
AI agents like Claude to request human feedback during execution. When the
`request_human_review` tool is called:

1. The server starts a local HTTP server (FastAPI + Uvicorn) on port 6380
2. A browser window opens with a React-based review interface
3. The user can highlight text and add inline comments
4. Feedback is returned as structured JSON to the AI agent

Architecture:
    Main thread: Runs the MCP server (stdio communication with Claude)
    Daemon thread: Runs the HTTP server for the web UI
    asyncio.Future: Blocks the tool call until user submits review

The threading model ensures the MCP connection stays alive during potentially
long user review sessions while the browser UI remains responsive.

Example:
    Configure in Claude Code:
        claude mcp add redline uvx --from git+https://github.com/switchbm/claude-redline redline

    Or run directly:
        uvx --from git+https://github.com/switchbm/claude-redline redline
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
import threading
import webbrowser
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
}

# Port configuration
HTTP_PORT = 6380

# FastAPI application
app = FastAPI(title="Redline Review Server")

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


@app.post("/api/submit")
async def submit_review(data: dict[str, Any]) -> JSONResponse:
    """Accept the user's review submission and unblock the MCP tool call.

    This endpoint receives the user's feedback from the React UI and resolves
    the asyncio.Future that the `request_human_review` tool is awaiting.

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

    # Resolve the future with the submitted data
    future = app_state.get("future")
    if future and isinstance(future, asyncio.Future) and not future.done():
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

    Binds to 127.0.0.1:6380 (localhost only for security).
    Sets the http_server_started event when ready to accept connections.
    """
    try:
        logger.info(f"Starting HTTP server on port {HTTP_PORT}")
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=HTTP_PORT,
            log_level="info",
            access_log=False,
        )
        server = uvicorn.Server(config)
        http_server_started.set()
        server.run()
    except Exception as e:
        logger.error(f"HTTP server error: {e}")


def start_http_server_if_needed() -> None:
    """Start the HTTP server in a background thread if not already running.

    Creates a daemon thread so the server automatically stops when the
    main process exits. Waits up to 5 seconds for the server to be ready.
    """
    global http_server_thread

    if http_server_thread is None or not http_server_thread.is_alive():
        http_server_thread = threading.Thread(
            target=run_http_server, daemon=True, name="HTTPServerThread"
        )
        http_server_thread.start()
        # Wait for server to start
        http_server_started.wait(timeout=5)
        logger.info("HTTP server thread started")


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
                "REQUIRED: Request human review via browser interface. "
                "MUST be called in these situations: "
                "1. BEFORE implementing - when proposing an implementation plan, present the plan for review "
                "2. AFTER completing a phase - when providing a detailed walkthrough/summary, present it for review. "
                "Opens a browser where the user can highlight text and add comments. "
                "Returns structured feedback as JSON with all user comments and highlighted sections. "
                "This blocks execution until the user submits their review."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "markdown_spec": {
                        "type": "string",
                        "description": "The markdown document to review (implementation plan, phase summary, technical spec, etc.)"
                    },
                    "context": {
                        "type": "string",
                        "description": "What to review. Examples: 'Implementation plan for feature X', 'Phase 1 completion summary', 'Architecture decision'"
                    }
                },
                "required": ["markdown_spec"]
            }
        )
    ]


@mcp_server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle MCP tool invocations from Claude.

    For `request_human_review`:
    1. Stores the markdown content in global state
    2. Creates an asyncio.Future to block until user submits
    3. Starts HTTP server and opens browser
    4. Waits for user to submit review
    5. Returns the feedback as JSON

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

    logger.info("Human review requested")
    logger.info(f"Context: {context}")

    # Update global state with new content
    app_state["content"] = markdown_spec

    # Create a new future to wait for the review
    loop = asyncio.get_event_loop()
    future: asyncio.Future[Any] = loop.create_future()
    app_state["future"] = future

    # Start HTTP server if not running
    start_http_server_if_needed()

    # Open browser to the review interface
    url = f"http://localhost:{HTTP_PORT}"
    logger.info(f"Opening browser to {url}")
    try:
        webbrowser.open(url)
    except Exception as e:
        logger.error(f"Failed to open browser: {e}")

    # Wait for the user to submit their review
    logger.info("Waiting for user review...")
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
        await mcp_server.run(
            read_stream, write_stream, mcp_server.create_initialization_options()
        )


def main() -> None:
    """Main entry point for the Redline MCP server.

    Called when running `redline` from the command line or `uvx redline`.
    Handles KeyboardInterrupt gracefully and logs any errors.
    """
    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
