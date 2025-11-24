# Redline MCP Integration Guide

## How Claude Code Discovers and Uses Redline

### Architecture Overview

```
┌─────────────────┐
│  Claude Code    │  (MCP Client)
│  / Claude       │
│   Desktop       │
└────────┬────────┘
         │ stdio (JSON-RPC)
         │
         │ 1. tools/list request
         │ ←─────────────────
         │ 2. tools response
         │    (including request_human_review)
         │
         │ 3. tools/call
         │    name: "request_human_review"
         │    args: {markdown_spec, context}
         ▼
┌─────────────────────────────┐
│  Redline MCP Server         │
│  (server.py)                │
│                             │
│  Main Thread:               │
│  • MCP Protocol Handler     │
│  • stdio communication      │
│                             │
│  Daemon Thread:             │
│  • FastAPI + Uvicorn        │
│  • HTTP Server :6380        │
└──────────┬──────────────────┘
           │
           │ 4. Open browser
           │    http://localhost:6380
           ▼
    ┌──────────────┐
    │   Browser    │
    │              │
    │ React UI     │
    │ (Review      │
    │  Interface)  │
    └──────┬───────┘
           │
           │ 5. User reviews,
           │    adds comments
           │
           │ 6. POST /api/submit
           │    {comments: [...]}
           ▼
    ┌──────────────┐
    │  Human       │
    │  Feedback    │
    └──────────────┘
           │
           │ 7. Return to Claude Code
           ▼
    ┌──────────────┐
    │  Structured  │
    │  JSON with   │
    │  Comments    │
    └──────────────┘
```

## Step-by-Step Integration

### 1. Install Redline

```bash
cd /path/to/claude-redline
python build_ui.py
uv sync
```

### 2. Configure MCP Server

**Location of config file:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Add Redline to configuration:**

```json
{
  "mcpServers": {
    "redline": {
      "command": "uv",
      "args": ["run", "redline"],
      "cwd": "/absolute/path/to/claude-redline"
    }
  }
}
```

⚠️ **Important**: Use the absolute path to your `claude-redline` directory.

### 3. Restart Claude Desktop

After modifying the config, restart Claude Desktop to load the new MCP server.

### 4. Verify Tool is Available

Ask Claude: "What MCP tools do you have access to?"

Claude should list `request_human_review` among available tools.

## How Claude Decides to Use the Tool

Claude Code will automatically use `request_human_review` when:

1. **Document Review Scenarios:**
   - User asks for feedback on a specification
   - User wants to review a generated document
   - User requests human input on design decisions

2. **Collaborative Workflows:**
   - Complex requirements that need clarification
   - Multiple options where human judgment is needed
   - Situations where visual review would be helpful

## Example Conversations

### Example 1: Specification Review

```
User: I've written a product spec. Can you help me review it?

[User pastes markdown specification]

Claude: I'll use the human review tool to get your feedback on this spec.

[Claude calls request_human_review]
[Browser opens with the spec]
[User highlights sections and adds comments]
[User clicks Submit]

Claude: Thanks for your feedback! I see you highlighted these areas:
1. "The API design section" - You mentioned it needs more detail
2. "Security considerations" - You asked about authentication

Let me revise the spec based on your comments...
```

### Example 2: Design Decision

```
User: I need to decide between two architectural approaches.
      Can you help me think through this?

Claude: Let me present both approaches in a format where you can
        easily highlight and comment on specific points.

[Claude calls request_human_review with comparison document]
[Browser opens]
[User highlights pros/cons and adds thoughts]

Claude: Based on your feedback, I see you're most concerned about
        scalability in Option A and complexity in Option B...
```

## Direct API Testing

You can test the tool directly without Claude Code:

### Method 1: Python Script

```python
import asyncio
import json
from mcp import ClientSession
from mcp.client.stdio import stdio_client

async def test_review():
    server_params = ServerParameters(
        command="uv",
        args=["run", "redline"],
        cwd="/path/to/claude-redline"
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Call the tool
            result = await session.call_tool(
                "request_human_review",
                arguments={
                    "markdown_spec": "# Test\n\nThis is a test.",
                    "context": "Please review"
                }
            )

            print(json.dumps(result, indent=2))

asyncio.run(test_review())
```

### Method 2: Manual JSON-RPC

1. Start the server:
```bash
uv run redline
```

2. Send JSON-RPC via stdin:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"request_human_review","arguments":{"markdown_spec":"# Test Document\n\nPlease review this.","context":"Testing"}}}
```

## Troubleshooting

### Server Doesn't Start

**Check:**
- Is the `cwd` path correct in config?
- Run `uv sync` to ensure dependencies are installed
- Check Claude Desktop logs for error messages

### Browser Doesn't Open

**Check:**
- Port 6380 isn't blocked by firewall
- Run `curl http://localhost:6380` to verify server is running
- Check if browser executable is accessible

### Comments Not Returning to Claude

**Check:**
- Network connectivity to localhost
- Browser console for JavaScript errors
- Server logs for submission errors

## Advanced Usage

### Custom Context Messages

Provide specific guidance in the `context` parameter:

```python
await session.call_tool(
    "request_human_review",
    arguments={
        "markdown_spec": spec_content,
        "context": "Please focus on: 1) Technical accuracy, 2) Clarity of examples, 3) Missing edge cases"
    }
)
```

### Programmatic Integration

Use Redline in your own MCP clients:

```python
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

# Configure Redline server
redline_params = StdioServerParameters(
    command="uv",
    args=["run", "redline"],
    cwd="/path/to/claude-redline"
)

# Use in your application
async with stdio_client(redline_params) as (read, write):
    async with ClientSession(read, write) as session:
        # Your code here
        pass
```

## Security Considerations

1. **Local Only**: The web server only binds to `127.0.0.1` (localhost)
2. **Temporary Session**: Each review creates a new session
3. **No Persistence**: Comments are only stored in memory during review
4. **No Authentication**: Assumes trusted local environment

## Performance Notes

- **Startup Time**: ~2-3 seconds for first review (server initialization)
- **Subsequent Reviews**: Instant (server stays running)
- **Memory Usage**: ~50-100MB for Python process + frontend
- **Browser Overhead**: Standard React app (~5-10MB)

## Future Enhancements

Potential improvements for future versions:

- [ ] Configurable port number
- [ ] Multiple simultaneous reviews
- [ ] Review history/replay
- [ ] Export comments to various formats
- [ ] Collaborative reviews (multiple users)
- [ ] Custom themes and styling
