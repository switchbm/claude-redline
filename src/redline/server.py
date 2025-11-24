#!/usr/bin/env python3
"""Redline MCP Server: Human-in-the-Loop review interface."""

import asyncio
import json
import logging
import os
import sys
import threading
import webbrowser
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state
app_state = {
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
async def get_content():
    """Return the current markdown content."""
    return JSONResponse({"content": app_state.get("content", "")})


@app.post("/api/submit")
async def submit_review(data: dict[str, Any]):
    """Accept the review submission and resolve the future."""
    logger.info(f"Review submitted with {len(data.get('comments', []))} comments")

    # Resolve the future with the submitted data
    if app_state["future"] and not app_state["future"].done():
        app_state["future"].set_result(data)

    return JSONResponse({"status": "ok"})


# Mount static files
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
else:
    logger.warning(f"Static directory not found: {static_dir}")
    logger.warning("Run 'python build_ui.py' to build the frontend assets")


# HTTP Server Thread
http_server_thread = None
http_server_started = threading.Event()


def run_http_server():
    """Run the HTTP server in a daemon thread."""
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


def start_http_server_if_needed():
    """Start the HTTP server if not already running."""
    global http_server_thread

    if http_server_thread is None or not http_server_thread.is_alive():
        http_server_thread = threading.Thread(
            target=run_http_server,
            daemon=True,
            name="HTTPServerThread"
        )
        http_server_thread.start()
        # Wait for server to start
        http_server_started.wait(timeout=5)
        logger.info("HTTP server thread started")


# MCP Server
mcp_server = Server("redline")


@mcp_server.list_tools()
async def list_tools() -> list[Tool]:
    """List available MCP tools."""
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
    """Handle tool calls."""
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
    app_state["future"] = loop.create_future()

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
    result = await app_state["future"]

    logger.info("Review received!")

    # Return the structured feedback
    return [
        TextContent(
            type="text",
            text=json.dumps(result, indent=2)
        )
    ]


async def async_main():
    """Main async entry point for the MCP server."""
    logger.info("Starting Redline MCP Server")

    async with stdio_server() as (read_stream, write_stream):
        await mcp_server.run(
            read_stream,
            write_stream,
            mcp_server.create_initialization_options()
        )


def main():
    """Main entry point."""
    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
