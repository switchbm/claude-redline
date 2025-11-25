# Redline Review Data Structure

## Overview

This document describes the JSON payload structure returned by the Redline review interface.

## Response Format

When a user submits a review, Claude Code receives the following JSON structure:

```json
{
  "comments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "quote": "async processing",
      "full_line_text": "The authentication will use JWT tokens with async processing.",
      "user_comment": "Please clarify what 'async processing' means in this context.",
      "timestamp": 1732444800000
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "quote": "bcrypt",
      "full_line_text": "Passwords will be hashed using bcrypt",
      "user_comment": "Consider using Argon2 instead for better security.",
      "timestamp": 1732444900000
    }
  ],
  "user_overall_comment": "Overall the plan looks solid. Just a few clarifications needed before we proceed."
}
```

## Field Definitions

### Comment Object

Each comment in the `comments` array contains:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier (UUID v4) | `"550e8400-e29b-41d4-a716-446655440000"` |
| `quote` | string | The exact text the user highlighted | `"async processing"` |
| `full_line_text` | string | The complete line containing the quote | `"The authentication will use JWT tokens with async processing."` |
| `user_comment` | string | The user's feedback on the highlighted text | `"Please clarify what 'async processing' means"` |
| `timestamp` | number | Unix timestamp (milliseconds) when comment was created | `1732444800000` |

### Overall Comment

| Field | Type | Description | Values |
|-------|------|-------------|--------|
| `user_overall_comment` | string \| null | Summary comment about the entire document | Any text or `null` |

**Special Case:** If the user submits with no inline comments and no overall comment (blank approval), this field is automatically set to `"LGTM"`.

## Usage Examples

### Example 1: Detailed Review with Multiple Comments

```json
{
  "comments": [
    {
      "id": "abc-123",
      "quote": "SQLite database",
      "full_line_text": "We'll use SQLite database for local development",
      "user_comment": "Use PostgreSQL from the start to match production",
      "timestamp": 1732444800000
    },
    {
      "id": "def-456",
      "quote": "no authentication",
      "full_line_text": "Phase 1 will have no authentication",
      "user_comment": "Add auth in Phase 1, not later",
      "timestamp": 1732444850000
    }
  ],
  "user_overall_comment": "Good plan overall. Please address the database choice and move auth to Phase 1."
}
```

### Example 2: Quick Approval (LGTM)

When user clicks Submit without adding any comments:

```json
{
  "comments": [],
  "user_overall_comment": "LGTM"
}
```

### Example 3: Inline Comments Only

```json
{
  "comments": [
    {
      "id": "xyz-789",
      "quote": "rate limiting",
      "full_line_text": "Add rate limiting to login endpoints",
      "user_comment": "What limits? 5 attempts per minute?",
      "timestamp": 1732445000000
    }
  ],
  "user_overall_comment": null
}
```

### Example 4: Overall Comment Only

```json
{
  "comments": [],
  "user_overall_comment": "This looks good. One concern: have we considered the scalability implications?"
}
```

## Processing Recommendations

### For Claude Code

When processing feedback:

1. **Check `user_overall_comment` first** for high-level guidance
2. **Iterate through `comments`** for specific section feedback
3. **Use `full_line_text`** to understand context of each comment
4. **Use `quote`** to locate the exact text being discussed
5. **Consider `timestamp`** to understand review order (if needed)

### Response Strategy

```python
# Example processing logic
def process_review(review_data):
    overall = review_data.get('user_overall_comment')
    comments = review_data.get('comments', [])

    if overall == 'LGTM' and len(comments) == 0:
        # User approved without changes
        print("Plan approved! Proceeding with implementation.")
        return

    if overall:
        print(f"Overall feedback: {overall}")

    if comments:
        print(f"\nDetailed feedback on {len(comments)} sections:")
        for comment in comments:
            print(f"\nRegarding: '{comment['quote']}'")
            print(f"Context: {comment['full_line_text']}")
            print(f"Feedback: {comment['user_comment']}")
```

## Data Validation

All fields are guaranteed to be present in the response:

- `comments`: Always an array (may be empty)
- `user_overall_comment`: Always present (string or null, or "LGTM" for blank approvals)
- Each comment object: Always contains all 5 fields

## Migration from Previous Version

If you were using an older version:

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `text` | `user_comment` | Renamed for clarity |
| `overallComment` | `user_overall_comment` | Renamed for clarity |
| N/A | `full_line_text` | New field - provides line context |
| N/A | Auto "LGTM" | New behavior - blank approvals get "LGTM" |

## Benefits of This Structure

1. **Context-Rich**: `full_line_text` gives Claude the surrounding context
2. **Explicit Approval**: "LGTM" makes blank approvals clear and unambiguous
3. **Clear Naming**: `user_comment` and `user_overall_comment` are explicit
4. **Structured**: Easy to parse and process programmatically
5. **Complete**: All information needed to understand and act on feedback
