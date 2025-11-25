# Contributing to Redline

First off, thank you for considering contributing to Redline! It's people like you that make Redline such a great tool for the AI development community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Types of Contributions

We welcome many types of contributions:

- **Bug Reports**: Found something broken? Let us know!
- **Feature Requests**: Have an idea? We'd love to hear it!
- **Code Contributions**: Bug fixes, features, or improvements
- **Documentation**: Typo fixes, clarifications, or new guides
- **Testing**: Additional test cases or edge case coverage

### First Time Contributors

Look for issues labeled [`good first issue`](https://github.com/switchbm/claude-redline/labels/good%20first%20issue) - these are great starting points.

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 18+ (for frontend development)
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager

### Setting Up Your Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/claude-redline.git
   cd claude-redline
   ```

2. **Install Python dependencies**
   ```bash
   uv sync --dev
   ```

3. **Install frontend dependencies** (if modifying the UI)
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Verify the setup**
   ```bash
   # Run tests
   uv run pytest

   # Run type checker
   uv run mypy src/redline

   # Run linter
   uv run ruff check .
   ```

### Project Structure

```
claude-redline/
├── src/redline/          # Python MCP server
│   ├── __init__.py
│   ├── server.py         # Main server code
│   └── static/           # Compiled frontend (don't edit directly)
├── frontend/             # React frontend source
│   └── src/
│       ├── App.tsx       # Main component
│       └── index.css     # Styles
├── tests/                # Python tests
└── pyproject.toml        # Project configuration
```

## Making Changes

### Creating a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### Running the Server Locally

```bash
# Start the MCP server (for testing with Claude)
uv run redline

# For frontend development with hot reload:
cd frontend && npm run dev  # Terminal 1
uv run redline              # Terminal 2
```

### Building the Frontend

After making frontend changes:

```bash
python build_ui.py
```

This compiles the React app and copies it to `src/redline/static/`.

## Submitting Changes

### Pull Request Process

1. **Ensure all tests pass**
   ```bash
   uv run pytest
   uv run mypy src/redline
   uv run ruff check .
   ```

2. **Update documentation** if needed

3. **Write a clear PR description**
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?

4. **Link related issues** using keywords like `Fixes #123`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for custom port configuration
fix: resolve highlighting issue with nested quotes
docs: add troubleshooting section for Windows
test: add coverage for edge cases in submit handler
refactor: simplify HTTP server thread management
```

## Style Guidelines

### Python

- Follow PEP 8 (enforced by Ruff)
- Use type hints for all function signatures
- Write docstrings for public functions
- Keep functions focused and small

```python
def submit_review(data: dict[str, Any]) -> JSONResponse:
    """Accept the review submission and resolve the pending future.

    Args:
        data: Review data containing comments and overall feedback.

    Returns:
        JSON response with status confirmation.
    """
    ...
```

### TypeScript/React

- Use functional components with hooks
- Prefer explicit types over `any`
- Keep components under 300 lines (split if needed)
- Use Tailwind CSS for styling

```typescript
interface Comment {
  id: string;
  quote: string;
  text: string;
  timestamp: string;
}
```

### General

- Keep lines under 100 characters
- Use meaningful variable names
- Comment "why", not "what"

## Testing

### Running Tests

```bash
# All tests with coverage
uv run pytest

# Specific test file
uv run pytest tests/test_server.py

# Verbose output
uv run pytest -v

# Stop on first failure
uv run pytest -x
```

### Writing Tests

- Place tests in the `tests/` directory
- Name test files `test_*.py`
- Use descriptive test names
- Test both happy path and edge cases

```python
class TestSubmitReview:
    def test_submit_with_comments(self, client):
        """Submitting with comments returns success and stores feedback."""
        ...

    def test_submit_empty_resolves_future(self, client):
        """Submitting without comments still resolves the pending future."""
        ...
```

### Coverage Requirements

- Minimum 80% coverage is required
- New code should have tests
- Run `uv run pytest --cov-report=html` to see detailed coverage

## Documentation

### When to Update Docs

- New features need documentation
- API changes need updated examples
- Bug fixes that change behavior

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Quick start and overview |
| `INTEGRATION.md` | Detailed setup guide |
| `DATA-STRUCTURE.md` | Response format specification |
| `PROMPT-TEMPLATES.md` | Example prompts |
| `AUTO-REVIEW-SETUP.md` | Workflow configuration |

### Writing Style

- Use clear, simple language
- Include code examples
- Test all commands before documenting

## Questions?

- Open a [Discussion](https://github.com/switchbm/claude-redline/discussions) for questions
- Check existing [Issues](https://github.com/switchbm/claude-redline/issues) before opening new ones
- Join the conversation and help others!

---

Thank you for contributing to Redline! Every contribution, no matter how small, helps make AI-assisted development better for everyone.
