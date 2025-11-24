# Automatic Review Setup for Claude Code

This guide explains how to configure Claude Code to automatically trigger Redline reviews at key decision points.

## Overview

With proper configuration, Claude Code will automatically:
1. **Present implementation plans for review** before writing any code
2. **Present phase completion summaries** after finishing significant work

This creates natural checkpoints where you can provide feedback, catch issues early, and guide the implementation.

## Setup Instructions

### Step 1: Install and Configure Redline MCP Server

1. **Build and install Redline:**
```bash
cd /path/to/claude-redline
python build_ui.py
uv sync
```

2. **Add to Claude Desktop MCP configuration:**

Edit your config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

3. **Restart Claude Desktop**

### Step 2: Add Custom Instructions (Optional but Recommended)

To make Claude more consistent about using reviews, add this to your conversation or project instructions:

```
When working on implementation tasks, use the request_human_review tool:

1. BEFORE implementing: Present your implementation plan for review
2. AFTER completing a phase: Present a detailed summary for review

Format review documents with clear sections and include key decisions.
Wait for and address feedback before proceeding.
```

### Step 3: Use Prompting Strategies

When starting a new task, use prompts that reinforce the review workflow:

#### ✅ Good Prompts:

**For Implementation Tasks:**
```
"Build a user authentication system. Before you start coding,
present an implementation plan for my review."
```

**For Complex Projects:**
```
"Implement feature X. Create a plan, get my approval, then proceed
phase by phase with reviews after each phase."
```

**For Refactoring:**
```
"Refactor the authentication module. Show me your approach before
making changes, and summarize what you did afterward."
```

#### ❌ Less Effective Prompts:

```
"Build user authentication"
// Too vague - doesn't mention review
```

```
"Make the changes and let me know when done"
// Skips the planning review step
```

## How It Works

### 1. Tool Description Directives

The Redline MCP tool description includes explicit directives:

```
REQUIRED: Request human review via browser interface.
MUST be called in these situations:
1. BEFORE implementing - when proposing an implementation plan
2. AFTER completing a phase - when providing a detailed walkthrough
```

Claude Code reads this description and uses it to decide when to call the tool.

### 2. Workflow Example

Here's what a typical workflow looks like:

```
You: "Build a REST API for managing todos"

Claude: "I'll create an implementation plan for your review first."

[Claude prepares markdown plan:]
# Implementation Plan: Todo REST API

## Overview
Building a RESTful API with CRUD operations...

## Architecture Decisions
- FastAPI for the web framework
- SQLite for development database
- Pydantic for validation
...

## File Structure
- app/
  - main.py (FastAPI app)
  - models.py (Pydantic models)
  - database.py (DB connection)
...

## Implementation Phases
1. Project setup and dependencies
2. Database models and migrations
3. CRUD endpoints
4. Testing and documentation

[Claude calls request_human_review with this plan]
[Browser opens at localhost:6380]

You: [Highlight "SQLite for development"]
     Comment: "Use PostgreSQL from the start"

You: [Highlight "Implementation Phases"]
     Comment: "Add authentication in phase 3"

You: [Click Submit Review]

Claude: "Thanks for the feedback! I'll:
1. Use PostgreSQL instead of SQLite
2. Add authentication as Phase 3

Let me revise the plan..."

[Claude proceeds with implementation]
[After Phase 1 completes...]

Claude: "Phase 1 complete. Here's a summary for review:"

# Phase 1 Summary: Project Setup

## What Was Built
- FastAPI application structure
- PostgreSQL connection with SQLAlchemy
- Base models for Todo entity
...

## Key Files Changed
- app/main.py: 45 lines
- app/database.py: 30 lines
...

## Next Steps
Phase 2: Implement CRUD endpoints

[Claude calls request_human_review again]
[You review and approve]
[Cycle continues...]
```

## Customization

### Adjust Review Frequency

If you want MORE frequent reviews:
```
"Build feature X. Review every major decision with me."
```

If you want LESS frequent reviews:
```
"Build feature X. Review the initial plan, then only check in
at major milestones."
```

### Domain-Specific Reviews

```
"Build the API. Pay special attention to security decisions
and review those with me before implementing."
```

## Troubleshooting

### Claude Isn't Using Reviews Automatically

**Try:**
1. Be explicit in your prompt: "Present a plan for my review first"
2. Check MCP configuration is correct
3. Verify Redline server is running: `uv run redline` should start without errors
4. Check Claude Desktop logs for MCP connection issues

### Reviews Are Too Frequent/Infrequent

**Adjust your prompts:**
- "Review only major architectural decisions"
- "Review after each component is complete"
- "Check in with me at natural breakpoints"

### Browser Not Opening

**Check:**
- Port 6380 is not blocked
- Firewall allows localhost connections
- Browser is set as default application

## Advanced: Project-Level Configuration

For teams or repeated workflows, create a project configuration:

**`.claude/redline-config.md`**
```markdown
# Project Review Policy

This project uses Redline for HITL reviews.

## Required Reviews:
1. Initial architecture/design plan
2. API contract definitions
3. Database schema changes
4. Security-related implementations
5. Phase completion summaries

## Review Format:
- Clear problem statement
- Proposed solution with alternatives considered
- Trade-offs and risks
- Implementation checklist

## After Review:
- Address all comments
- Update plan based on feedback
- Document decisions made
```

Then reference it: "Build feature X following our project review policy"

## Benefits of This Workflow

✅ **Catch Issues Early**: Review plans before code is written
✅ **Better Communication**: Clear documentation of what was built
✅ **Guided Development**: Provide feedback at natural checkpoints
✅ **Reduced Rework**: Validate approach before implementation
✅ **Knowledge Transfer**: Summaries create implementation documentation
✅ **Quality Gates**: Explicit approval points in the development process

## Examples from Real Projects

### Web Application Development
```
You: "Build a blog platform with auth, posts, comments"

Claude: [Presents plan] → You review → Approve
Claude: [Implements Phase 1: Auth] → Presents summary → You review
Claude: [Implements Phase 2: Posts] → Presents summary → You review
Claude: [Implements Phase 3: Comments] → Presents summary → Done!
```

### Database Migration
```
You: "Migrate from MongoDB to PostgreSQL"

Claude: [Presents migration plan] → You review schema mapping
Claude: [Implements migration scripts] → You review for data safety
Claude: [Runs migration] → Presents results → You verify
```

### Refactoring Project
```
You: "Refactor the payment processing module"

Claude: [Analyzes code] → Presents refactoring strategy → You review
Claude: [Phase 1: Extract services] → Summary → You verify tests pass
Claude: [Phase 2: Update callers] → Summary → You verify behavior
```

## Next Steps

1. ✅ Configure Redline in Claude Desktop
2. ✅ Try a simple task with explicit review prompts
3. ✅ Refine your prompting style
4. ✅ Build review workflows into your development process

For more details, see [INTEGRATION.md](INTEGRATION.md)
