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

### 1. Install (Choose One)

**Option A: Zero Install with uvx** (Recommended)
```bash
# Nothing to install! Just configure below.
```

**Option B: Install Globally**
```bash
uv tool install git+https://github.com/switchbm/claude-redline
```

### 2. Configure Claude

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

Run this command:
```bash
claude mcp add-json redline '{"type":"stdio","command":"uvx","args":["--from","git+https://github.com/switchbm/claude-redline","redline"]}'
```

Or add to your project's `.mcp.json`:
```json
{
  "mcpServers": {
    "redline": {
      "type": "stdio",
      "command": "uvx",
      "args": ["--from", "git+https://github.com/switchbm/claude-redline", "redline"]
    }
  }
}
```
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

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
      "args": ["--from", "git+https://github.com/switchbm/claude-redline", "redline"]
    }
  }
}
```
</details>

### 3. Choose a Theme (Optional)

Redline includes 6 built-in themes. Add `--theme <name>` to customize the look:

| Theme | Description |
|-------|-------------|
| `default` | Clean professional blue/gray (default) |
| `dark` | Modern dark mode for low-light environments |
| `forest` | Nature-inspired with earthy green tones |
| `ocean` | Calm oceanic with blue and teal accents |
| `sunset` | Warm sunset with orange and amber tones |
| `minimal` | Ultra-clean with subtle contrasts |

<details>
<summary><strong>Example: Dark Theme with Claude Code</strong></summary>

```bash
claude mcp add-json redline '{"type":"stdio","command":"uvx","args":["--from","git+https://github.com/switchbm/claude-redline","redline","--theme","dark"]}'
```

Or in `.mcp.json`:
```json
{
  "mcpServers": {
    "redline": {
      "type": "stdio",
      "command": "uvx",
      "args": ["--from", "git+https://github.com/switchbm/claude-redline", "redline", "--theme", "dark"]
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
      "args": ["--from", "git+https://github.com/switchbm/claude-redline", "redline", "--theme", "ocean"]
    }
  }
}
```
</details>

**List available themes:**
```bash
uvx --from git+https://github.com/switchbm/claude-redline redline --list-themes
```

### 4. Use It

Tell Claude to present plans and summaries for review:

```
Build a REST API for user management. Present your implementation
plan for review first, then show me phase summaries as you complete them.
```

That's it! Claude will automatically open your browser for reviews at the right moments.

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
- FastAPI HTTP server runs on `localhost:6380`
- React frontend renders markdown and captures feedback
- Feedback returns as structured JSON

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
- [ ] Custom port configuration
- [ ] Multiple concurrent reviews
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
