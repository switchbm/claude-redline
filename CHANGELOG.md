# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **UI Themes**: 6 customizable themes for the review interface
  - `default` - Clean professional blue/gray (default)
  - `dark` - Modern dark mode for low-light environments
  - `forest` - Nature-inspired with earthy green tones
  - `ocean` - Calm oceanic with blue and teal accents
  - `sunset` - Warm sunset with orange and amber tones
  - `minimal` - Ultra-clean with subtle contrasts
- CLI argument `--theme <name>` to select theme at startup
- CLI argument `--list-themes` to show available themes
- `/api/config` endpoint for frontend to fetch theme configuration
- Extensible theme architecture using CSS custom properties

## [0.1.0] - 2024-12-01

### Added
- Initial release of Redline
- MCP server with `request_human_review` tool
- Browser-based review interface with React + Tailwind CSS
- Text highlighting and inline commenting system
- Structured JSON feedback output
- Support for Claude Desktop and Claude Code
- Zero-install usage via `uvx`
- Comprehensive documentation:
  - README with installation guides
  - INTEGRATION.md with architecture details
  - DATA-STRUCTURE.md with response format specs
  - PROMPT-TEMPLATES.md with copy-paste prompts
  - AUTO-REVIEW-SETUP.md with workflow examples

### Technical
- Python 3.12+ with FastAPI and Uvicorn
- React 18 with TypeScript and Vite
- 80%+ test coverage requirement
- Strict mypy type checking
- Ruff linting and formatting

[Unreleased]: https://github.com/switchbm/claude-redline/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/switchbm/claude-redline/releases/tag/v0.1.0
