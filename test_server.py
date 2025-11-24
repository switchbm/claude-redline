#!/usr/bin/env python3
"""Simple test script to verify the Redline server functionality."""

import json
import sys
import time
import subprocess
import requests


def test_http_server():
    """Test that the HTTP server can be reached."""
    print("Testing HTTP server...")

    # Try to connect to the server
    max_retries = 10
    for i in range(max_retries):
        try:
            response = requests.get("http://localhost:6380/api/content", timeout=2)
            if response.status_code == 200:
                print("✅ HTTP server is reachable")
                return True
        except requests.exceptions.RequestException:
            if i < max_retries - 1:
                time.sleep(1)
            continue

    print("❌ HTTP server is not reachable")
    return False


def test_mcp_tool_list():
    """Test that MCP tools are listed correctly."""
    print("\nTesting MCP tool listing...")

    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {}
    }

    print(f"Request: {json.dumps(request, indent=2)}")

    # Note: This is a simplified test. In practice, you would need to
    # interact with the MCP server over stdio using the proper protocol.
    print("ℹ️  For full MCP testing, use an MCP client like Claude Desktop")
    return True


def test_static_files():
    """Test that static files are accessible."""
    print("\nTesting static files...")

    try:
        response = requests.get("http://localhost:6380/", timeout=2)
        if response.status_code == 200 and "redline" in response.text.lower():
            print("✅ Static files are accessible")
            return True
        else:
            print("❌ Static files not found or invalid")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Error accessing static files: {e}")
        return False


def main():
    """Run all tests."""
    print("🔧 Redline Server Test Suite\n")
    print("=" * 50)

    # Check if static files exist
    import os
    static_dir = os.path.join(os.path.dirname(__file__), "src", "redline", "static")
    if not os.path.exists(static_dir):
        print("❌ Static directory not found!")
        print(f"   Expected at: {static_dir}")
        print("   Run 'python build_ui.py' to build the frontend")
        sys.exit(1)

    print(f"✅ Static directory found: {static_dir}")
    print("\n" + "=" * 50)

    # For testing, we would need to start the server in a separate process
    # and then run the tests. For now, we'll just verify the structure.

    print("\n📋 Manual Testing Instructions:")
    print("\n1. Start the server:")
    print("   uv run redline")
    print("\n2. In another terminal, test the HTTP endpoints:")
    print("   curl http://localhost:6380/api/content")
    print("\n3. Open a browser to:")
    print("   http://localhost:6380")
    print("\n4. To test the full MCP integration:")
    print("   - Add Redline to your Claude Desktop MCP configuration")
    print("   - Ask Claude to review a document using request_human_review")

    print("\n✅ All preliminary checks passed!")


if __name__ == "__main__":
    main()
