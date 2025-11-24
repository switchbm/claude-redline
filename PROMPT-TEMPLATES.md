# Prompt Templates for Automatic Reviews

Copy-paste these prompts to ensure Claude Code uses Redline reviews automatically.

## Setup Prompt (One-Time)

Add this to your conversation when starting work with Redline:

```
For all implementation work:
- Present an implementation plan for my review BEFORE coding
- Present a completion summary for my review AFTER each phase
- Use the request_human_review MCP tool for both

Wait for my feedback before proceeding to the next step.
```

## Task Prompts

### New Feature Implementation

```
Build [feature description].

Before writing any code, present a detailed implementation plan for my review covering:
- Overall approach and architecture
- Component breakdown
- File structure
- Key technical decisions
- Implementation phases

After I approve the plan, implement it phase by phase.
After each phase, present a summary for my review before continuing.
```

### Bug Fix

```
Fix [bug description].

First, analyze the issue and present your fix strategy for review.
After I approve, implement the fix and present a summary of what was changed.
```

### Refactoring

```
Refactor [code/module description].

Present a refactoring plan first covering:
- Current issues/problems
- Proposed improvements
- Risk assessment
- Testing strategy

Get my approval, then proceed with reviews after each major change.
```

### API Development

```
Build a [API description].

Present an API design plan for review including:
- Endpoint specifications
- Data models
- Authentication approach
- Error handling strategy

After approval, implement phase by phase with reviews.
```

### Database Schema

```
Design and implement [database description].

Present the schema design for review including:
- Entity relationships
- Table structures
- Indexes and constraints
- Migration strategy

Get approval before creating migrations and implementing.
```

## Quick Prompts

### Simple Implementation
```
"Build X. Present plan → get approval → implement → present summary."
```

### Multi-Phase Project
```
"Build X in phases. Review plan first, then review after each phase."
```

### High-Stakes Change
```
"Make change X. Review every major decision with me before implementing."
```

## Project-Specific Templates

### For Team Projects

```
Working on [project name].

Our review policy:
- All architectural decisions require review
- All API changes require review
- All database changes require review
- Completion summaries after each sprint task

Use request_human_review for all review points.
```

### For Learning Projects

```
I'm learning [technology/language].

For each task:
1. Explain your approach and present plan
2. Get my feedback
3. Implement
4. Explain what you built in a summary
5. Get my feedback on the implementation

This helps me learn by reviewing your thought process.
```

### For Critical Systems

```
Working on [critical system].

STRICT REVIEW PROCESS:
- Present detailed plan with risk analysis
- I must approve before ANY code changes
- After implementation, present:
  - What changed
  - Testing performed
  - Rollback procedure
- I must approve before considering complete
```

## Workflow Enforcement Prompts

### Start of Session
```
Reminder: Use request_human_review before implementing and after completing phases.
```

### Mid-Implementation
```
"Before you continue, let me review what you've built so far."
```

### Before Major Change
```
"Stop. Present your plan for this change before implementing."
```

## Example Conversations

### Example 1: Full Workflow

**You:**
```
Build a user authentication system with email/password and OAuth.

Present an implementation plan for my review first, then proceed
phase by phase with reviews after each phase.
```

**Claude:**
```
I'll create a detailed implementation plan for your review.

[Calls request_human_review with plan document]
```

**[Browser opens, you review and comment]**

**Claude:**
```
Thanks for your feedback! Based on your comments:
- I'll use bcrypt instead of SHA-256
- I'll add rate limiting from the start
- OAuth will be implemented in Phase 2, not Phase 3

Let me proceed with Phase 1...

[Implements Phase 1]

Phase 1 is complete. Let me present a summary for your review.

[Calls request_human_review with summary]
```

**[Cycle continues...]**

### Example 2: Quick Task

**You:**
```
Add a DELETE endpoint for todos. Plan → Approve → Implement → Summary.
```

**Claude:**
```
[Presents plan for review]
```

**You:**
```
[Reviews in browser] "Add cascading delete for related data"
```

**Claude:**
```
[Implements with cascading delete]
[Presents summary for review]
```

**You:**
```
[Approves] "Perfect, looks good!"
```

## Anti-Patterns (What NOT to Say)

❌ **Too Vague**
```
"Build authentication"
```
→ Doesn't mention reviews, Claude might skip them

❌ **Rushing**
```
"Just implement it quickly"
```
→ Implies skipping review process

❌ **Implicit Expectations**
```
"Build X like we usually do"
```
→ Claude might not know "we usually do" includes reviews

## Best Practices

✅ **Be Explicit**
```
"Present plan → Review → Implement → Present summary → Review"
```

✅ **Set Expectations Upfront**
```
"For this project, I want to review all plans and phase completions"
```

✅ **Reference the Tool**
```
"Use request_human_review for the plan and summaries"
```

✅ **Specify Review Focus**
```
"Present plan for review, focusing on security decisions"
```

## Cheat Sheet

Copy this to your notes:

```
📋 STANDARD PROMPT:
"Build [X]. Present implementation plan for review BEFORE coding.
After each phase, present summary for review. Use request_human_review."

🚀 QUICK PROMPT:
"Build [X]. Plan → Review → Implement → Summary → Review"

⚠️ CRITICAL PROMPT:
"Build [X]. Review ALL decisions before implementing."

📚 LEARNING PROMPT:
"Build [X]. Explain your approach, get feedback, implement, explain results."
```

## Integration with Your Workflow

### For Daily Development
Add to your daily standup:
```
"Today's tasks will follow the review workflow:
plan → review → implement → review"
```

### For Code Reviews
```
"Before creating the PR, present a summary of changes for review"
```

### For Pair Programming
```
"Let's work together. Present your ideas for review before implementing"
```

## Troubleshooting Prompts

If Claude isn't using reviews:

```
"Remember to use request_human_review for plans and summaries"
```

If Claude is using too many reviews:

```
"Only use request_human_review for the initial plan and final summary"
```

If you want to skip a review:

```
"This change is minor, skip the review and just implement it"
```

---

**Pro Tip**: Save your favorite prompts as text snippets or shell aliases for quick access!
