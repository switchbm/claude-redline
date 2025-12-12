<p align="center">
  <img src="https://img.shields.io/badge/MCP-Compatible-brightgreen?style=for-the-badge" alt="MCP Compatible">
  <img src="https://img.shields.io/badge/Python-3.12+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.12+">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License">
  <img src="https://img.shields.io/badge/Claude-Desktop%20%26%20Code-orange?style=for-the-badge" alt="Claude Desktop & Code">
</p>

<h1 align="center">Redline</h1>

<p align="center">
  <strong>Human-in-the-Loop Review Interface for AI Agents</strong>
</p>

<p align="center">
  Give feedback to Claude <em>during</em> implementation, not after.<br>
  Review plans before code is written. Approve changes at natural checkpoints.
</p>

---

## The Problem

When working with AI coding assistants, you typically review work **after** it's done. This leads to:

- 🔄 Expensive rewrites when the approach was wrong
- 😤 Frustration when AI misunderstands requirements
- ⏰ Wasted time reviewing large changesets
- 🎯 Missed opportunities to guide implementation

## The Solution

**Redline** creates natural checkpoints where Claude pauses and asks for your input:

```
You: "Build a user authentication system"

Claude: "Here's my implementation plan. Let me get your feedback first."
        → Browser opens with the plan
        → You highlight concerns, add comments
        → Click "Submit Review"

Claude: "Thanks! Based on your feedback, I'll use JWT instead of sessions..."
        → Implements Phase 1

Claude: "Phase 1 complete. Here's what I built:"
        → Browser opens with summary
        → You approve or request changes

Claude: → Continues to Phase 2...
```

**Result**: You guide the implementation in real-time, catching issues before they become expensive problems.

---

## Features

- **Automatic Review Triggers** — Claude knows when to pause and ask for feedback
- **Rich Markdown Rendering** — Beautiful display of plans, specs, and summaries
- **Text Highlighting** — Select any text to add contextual comments
- **Inline Comments** — Detailed feedback directly on the document
- **Structured Feedback** — Returns JSON that Claude can act on
- **Zero Config** — Works immediately with Claude Desktop and Claude Code
- **Customizable Themes** — 6 built-in themes with easy extensibility

---

## Quick Start

### Prerequisites

Before installing Redline, you'll need **[uv](https://docs.astral.sh/uv/)** (Python's fast package manager):

**macOS/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Verify installation: `uv --version`

---

### Install as Plugin (Recommended)

The easiest way to install Redline is as a Claude Code plugin:

```bash
# Add the marketplace
/plugin marketplace add switchbm/claude-redline

# Install the plugin
/plugin install redline@redline-marketplace
```

This automatically configures the MCP server and adds the `/redline` slash command.

**Verify installation:**
```
/mcp
  redline: connected
```

**Auto-allow without permission prompts (optional):**

Add to your `~/.claude/settings.json`:
```json
{
  "permissions": {
    "allow": ["mcp__redline__request_human_review"]
  }
}
```

---

### Manual Installation

<details>
<summary><strong>Click to expand manual setup instructions</strong></summary>

#### Claude Code Setup

**Option 1: Global Installation (Recommended)**

This makes Redline available in ALL your Claude Code sessions:

```bash
claude mcp add-json redline '{"type":"stdio","command":"uvx","args":["--from","git+https://github.com/switchbm/claude-redline","redline"],"timeout":86400000}' -s user
```

**Option 2: Project-Specific Installation**

```bash
# Run this from your project directory
claude mcp add-json redline '{"type":"stdio","command":"uvx","args":["--from","git+https://github.com/switchbm/claude-redline","redline"],"timeout":86400000}'
```

This creates/updates `.mcp.json` in your project root.

---

#### Local Development Setup

If you're developing Redline locally or want to run from source:

```bash
# Clone and install
git clone https://github.com/switchbm/claude-redline.git
cd claude-redline
uv sync --dev

# Add to Claude Code (global)
claude mcp add-json redline '{"type":"stdio","command":"uv","args":["run","--directory","/path/to/claude-redline","redline"],"timeout":86400000}' -s user

# Or project-specific (omit -s user)
claude mcp add-json redline '{"type":"stdio","command":"uv","args":["run","--directory","/path/to/claude-redline","redline"],"timeout":86400000}'
```

Replace `/path/to/claude-redline` with your actual clone path.

---

### Claude Desktop Setup

<details>
<summary><strong>Click to expand Claude Desktop instructions</strong></summary>

Add to your config file:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "redline": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/switchbm/claude-redline", "redline"],
      "timeout": 86400000
    }
  }
}
```

The `timeout` is set to 24 hours (86400000ms) to allow unlimited time for thorough document review.
</details>

### Choose a Theme (Optional)

Redline includes 6 built-in themes. Add `--theme <name>` to customize the look:

| Theme | Description |
|-------|-------------|
| `dark` | Modern dark mode (default) |
| `clean` | Clean professional blue/gray |
| `forest` | Nature-inspired with earthy green tones |
| `ocean` | Calm oceanic with blue and teal accents |
| `sunset` | Warm sunset with orange and amber tones |
| `minimal` | Ultra-clean with subtle contrasts |

<details>
<summary><strong>Example: Clean Theme with Claude Code</strong></summary>

```bash
claude mcp add-json redline '{"type":"stdio","command":"uvx","args":["--from","git+https://github.com/switchbm/claude-redline","redline","--theme","clean"],"timeout":86400000}' -s user
```

Or in `.mcp.json`:
```json
{
  "mcpServers": {
    "redline": {
      "type": "stdio",
      "command": "uvx",
      "args": ["--from", "git+https://github.com/switchbm/claude-redline", "redline", "--theme", "clean"],
      "timeout": 86400000
    }
  }
}
```
</details>

<details>
<summary><strong>Example: Ocean Theme with Claude Desktop</strong></summary>

```json
{
  "mcpServers": {
    "redline": {
      "command": "uvx",
      "args": ["--from", "git+https://github.com/switchbm/claude-redline", "redline", "--theme", "ocean"],
      "timeout": 86400000
    }
  }
}
```
</details>

**List available themes:**
```bash
uvx --from git+https://github.com/switchbm/claude-redline redline --list-themes
```

</details>

---

### Use It

Tell Claude to present plans and summaries for review. Trigger words include "redline", "review", "present for review":

```
Build a REST API for user management. Present your implementation
plan for review first, then show me phase summaries as you complete them.
```

That's it! Claude will automatically open your browser for reviews at the right moments.

> **Note**: Redline has no timeout - take as long as you need. The browser will stay open until you click "Submit Review".

---

## Troubleshooting

<details>
<summary><strong>MCP Timeout Errors</strong></summary>

If you see "MCP error -32001: Request timed out", your MCP configuration may be missing the timeout setting.

**Solution**: Re-add Redline with a long timeout (the setup commands above include this by default):

```bash
claude mcp remove redline
claude mcp add-json redline '{"type":"stdio","command":"uvx","args":["--from","git+https://github.com/switchbm/claude-redline","redline"],"timeout":86400000}' -s user
```

The `timeout` value is in milliseconds (86400000 = 24 hours).
</details>

<details>
<summary><strong>Browser Doesn't Open</strong></summary>

If the browser doesn't open automatically:
1. Check the terminal/console output for a log message like "Opening browser to http://localhost:XXXXX" to find the dynamically-assigned port number
2. Manually navigate to that URL in your browser
3. Ensure you have a default browser configured

**Note**: Redline uses dynamic port allocation, so each instance runs on a different port to support multiple concurrent Claude Code sessions.
</details>

<details>
<summary><strong>Redline Not Appearing in /mcp</strong></summary>

1. Restart Claude Code after adding the MCP server
2. Check your config with `claude mcp list`
3. Verify the JSON syntax in your command
4. For global install, ensure you used `-s user`
</details>

---

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│  Redline Server  │────▶│    Browser UI   │
│   or Desktop    │     │   (MCP + HTTP)   │     │  (React + TW)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │  1. Calls tool with   │                        │
        │     markdown spec     │                        │
        │──────────────────────▶│                        │
        │                       │  2. Opens browser      │
        │                       │─────────────────────▶  │
        │                       │                        │
        │                       │  3. User reviews,      │
        │                       │     highlights,        │
        │                       │     comments           │
        │                       │◀─────────────────────  │
        │  4. Returns JSON      │                        │
        │     feedback          │                        │
        │◀──────────────────────│                        │
        │                       │                        │
        │  5. Claude acts on    │                        │
        │     feedback          │                        │
        ▼                       ▼                        ▼
```

**Technical Details:**
- MCP server communicates via stdio with Claude
- FastAPI HTTP server runs on a dynamically-allocated localhost port
- React frontend renders markdown and captures feedback
- Feedback returns as structured JSON
- Dynamic port allocation supports multiple concurrent Claude Code instances

---

## Example Output

When you submit a review, Claude receives structured feedback like this:

```json
{
  "user_overall_comment": "Good approach, but consider caching",
  "comments": [
    {
      "id": "c1a2b3c4",
      "quote": "query the database on every request",
      "text": "This could be slow with many users. Add Redis caching?",
      "fullLineContext": "The API will query the database on every request",
      "timestamp": "2024-12-01T10:30:00Z"
    }
  ]
}
```

Claude uses this to adjust the implementation, addressing your specific concerns.

---

## Prompt Templates

Copy-paste these prompts to trigger automatic reviews:

<details>
<summary><strong>Implementation with Reviews</strong></summary>

```
Build [FEATURE]. Before starting:
1. Present your implementation plan for review
2. After each major phase, show a summary for review
3. Address any feedback before continuing
```
</details>

<details>
<summary><strong>Refactoring with Approval</strong></summary>

```
Refactor [CODE/SYSTEM]. Present your refactoring plan for review first.
Show before/after comparisons at each step for approval.
```
</details>

<details>
<summary><strong>Architecture Decision</strong></summary>

```
Design the architecture for [SYSTEM]. Present options with pros/cons
for review. Wait for my decision before proceeding.
```
</details>

See [PROMPT-TEMPLATES.md](PROMPT-TEMPLATES.md) for 15+ more templates.

---

## Documentation

| Document | Description |
|----------|-------------|
| [INTEGRATION.md](INTEGRATION.md) | Detailed setup, architecture, troubleshooting |
| [DATA-STRUCTURE.md](DATA-STRUCTURE.md) | JSON response format specification |
| [PROMPT-TEMPLATES.md](PROMPT-TEMPLATES.md) | Copy-paste prompts for common scenarios |
| [AUTO-REVIEW-SETUP.md](AUTO-REVIEW-SETUP.md) | Workflow customization guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

---

## Development

### Prerequisites

- Python 3.12+
- Node.js 18+ (for frontend changes)
- [uv](https://docs.astral.sh/uv/) package manager

### Setup

```bash
git clone https://github.com/switchbm/claude-redline.git
cd claude-redline
uv sync --dev
```

### Running Tests

```bash
uv run pytest                    # Run tests with coverage
uv run mypy src/redline          # Type checking
uv run ruff check .              # Linting
```

### Building Frontend

Only needed if you modify the React code:

```bash
python build_ui.py
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| MCP Server | Python 3.12, MCP SDK |
| HTTP Server | FastAPI, Uvicorn |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Package Manager | uv |

---

## Roadmap

- [x] Customizable UI themes
- [x] Dynamic port allocation (supports multiple concurrent instances)
- [ ] User-specified port configuration
- [ ] Multiple reviews in a single browser window
- [ ] Review history persistence
- [ ] VS Code extension
- [ ] Custom review templates
- [ ] Team collaboration features

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Links

- [Report a Bug](https://github.com/switchbm/claude-redline/issues/new?template=bug_report.md)
- [Request a Feature](https://github.com/switchbm/claude-redline/issues/new?template=feature_request.md)
- [Ask a Question](https://github.com/switchbm/claude-redline/discussions)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built for the [Model Context Protocol](https://modelcontextprotocol.io/) ecosystem.

---

<p align="center">
  <strong>If Redline helps your workflow, consider giving it a ⭐</strong>
</p>
