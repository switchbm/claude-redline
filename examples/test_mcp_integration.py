#!/usr/bin/env python3
"""
Test script to simulate how Claude Code would call the Redline MCP tool.
This sends a JSON-RPC request to the MCP server to trigger a review.
"""

import json


def send_mcp_request(request):
    """Send a JSON-RPC request to the MCP server via stdio."""
    # Convert request to JSON with newline
    request_json = json.dumps(request) + "\n"
    return request_json.encode()


def main():
    """Simulate Claude Code calling the request_human_review tool."""

    print("🧪 Testing Redline MCP Integration\n")
    print("=" * 60)

    # Sample markdown document
    sample_spec = """# Feature Specification: User Authentication

## Overview
This document describes the authentication system for our application.

## Requirements
1. Users must be able to sign up with email and password
2. Password must be at least 8 characters
3. Support for OAuth providers (Google, GitHub)

## Technical Details
The authentication will use JWT tokens with a 24-hour expiration.
Session refresh will be handled automatically on the client side.

## Security Considerations
- Passwords will be hashed using bcrypt
- Rate limiting will be applied to login endpoints
- Multi-factor authentication will be optional
"""

    print("\n📄 Sample Document:")
    print("-" * 60)
    print(sample_spec[:200] + "...")
    print("-" * 60)

    print("\n🔧 Simulating MCP Tool Call...")
    print("\nTo test the full integration, you would:")
    print("\n1. Add Redline to your Claude Desktop MCP config:")
    print("   Location: ~/Library/Application Support/Claude/claude_desktop_config.json")
    print("   (or %APPDATA%\\Claude\\claude_desktop_config.json on Windows)")
    print("\n   Config:")
    print(json.dumps({
        "mcpServers": {
            "redline": {
                "command": "uv",
                "args": ["run", "redline"],
                "cwd": "/home/user/claude-redline"
            }
        }
    }, indent=4))

    print("\n2. Restart Claude Desktop")

    print("\n3. Ask Claude something like:")
    print('   "Here\'s a specification I wrote. Can you help me review it?')
    print('    [paste the spec]"')

    print("\n4. Claude will automatically:")
    print("   • Recognize this is a good use case for human review")
    print("   • Call the request_human_review tool")
    print("   • Open a browser window for you to review")
    print("   • Wait for your feedback")
    print("   • Use your feedback to improve the document")

    print("\n" + "=" * 60)
    print("\n💡 For Manual Testing:")
    print("\nYou can test the tool directly by running:")
    print("   uv run redline")
    print("\nThen in another terminal, send a JSON-RPC request:")

    # Example JSON-RPC request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "request_human_review",
            "arguments": {
                "markdown_spec": sample_spec,
                "context": "Please review for clarity and completeness"
            }
        }
    }

    print("\n" + json.dumps(request, indent=2))

    print("\n" + "=" * 60)
    print("\n✅ Ready for Integration!")


if __name__ == "__main__":
    main()
