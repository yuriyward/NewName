# AGENTS.md

This file provides guidance to AI agents working with this repository.

## Project Overview

This is a browser extension (WXT + React 19) that intelligently cleans up messy file names. It helps users automatically rename files to descriptive, human-readable names at save time or on demand, while detecting which files actually need renaming.

### Core Capabilities
- Smart file name analysis and pattern detection
- Suggested file names with context-aware templates
- Auto-rename flows with undo/preview support
- Scoped rules per folder and project
- Activity history and quick revert

## Development Commands

- `bun run dev` — Start dev server
- `bun run build` — Build for production
- `bun run zip` — Package the extension
- `bun run fix` — One-shot auto-fix and verify
- `bun run verify` — Lint, type-check, and build
- `bun run test` — Run unit tests (Vitest)
- `bun run test:watch` — Watch mode for tests
- `bun run coverage` — Generate coverage report

## Architecture

Built with WXT framework and React 19, using Tailwind CSS v4. Entry points live under `entrypoints/`. Global styles are in `assets/tailwind.css`.

### Key Structure
- `background.ts` — Service worker, rules, and file-system messaging
- `content.ts` — Content script for page integrations (optional)
- `popup/` — UI for suggestions, previews, and actions

### Tech Stack
- WXT (`defineBackground`, `defineContentScript`)
- React 19
- TypeScript (strict)
- Tailwind v4
- Biome for lint/format

### Conventions
- `@/` alias to workspace root
- Descriptive names; no barrel files
- Keep files focused, <300 lines when practical

## Code Quality Workflow

- `bun run fix` to auto-fix and verify
- `bun run verify` before PRs
- Resolve any linting or type errors that exist.

### Development Workflow Guidelines

- After each change, choose the lightest effective check:
  - Small fixes (docs, style-only, non-behavioral refactors, test-only): run `bun run fix`.
  - New behavior, new files/entrypoints, storage/background/manifest changes, or new dependencies: run `bun run verify`.
  - For behavior changes, also run tests: `bun run test` (or `bun run coverage`).
- If `verify` fails due to formatting/lints, run `bun run fix` then re-run `bun run verify`.
- Prefer `fix` before commit and `verify` before push.

## Testing

- Test file naming: `**/*.test.ts(x)`
- Commands: `bun run test`, `bun run test:watch`, `bun run coverage`.
- WXT APIs are auto-polyfilled in tests; reset state with `fakeBrowser.reset()` in `beforeEach` when using storage or browser APIs.
- When mocking `#imports`, mock the underlying real path (e.g., `wxt/utils/inject-script`).

### Code Organization (Domain-Driven Design)

- Group code by domain, not by layer or type. Examples for this project:
  - `entrypoints/shared/renaming/` — core renaming logic (parsing, scoring, rules, preview)
  - `entrypoints/shared/rules/` — rule storage, validation, presets
  - `entrypoints/shared/integrations/` — OS/browser integrations and file pickers
  - `entrypoints/shared/ui/` — UI-specific utilities and hooks
- Avoid `index.ts` barrel files. Import from concrete files with clear boundaries.
- Keep each file focused on a single responsibility.
- Prefer direct imports across domains; do not create circular dependencies.

### 🔍 Reuse-First Development

Always search before building new functionality:
- Scan `entrypoints/shared/` for existing utilities (validation, parsing, async, dates/formatters).
- Extend existing helpers when possible; avoid duplication.
- If adding a new utility that could be reused, place it under the appropriate domain directory.

#### File Structure Guidelines

- Keep files under 300 lines; split when exceeding scope.
- Limit to 3 concerns per file; extract helpers for clarity.
- Extract shared logic after 2+ uses.

## AI-Generated Documentation Hub

The `ai/` directory hosts both static and auto-generated docs.
- `ai/docs/README.md` — docs index
- `ai/docs/FILE-STRUCTURE.md` — auto-generated from code via TypeDoc
- Script: `node scripts/generate-structure-docs.js`

<!-- AUTO-GENERATED TREE START -->

```
├── popup/ # 2 files
│   ├── App.tsx # Main popup interface and WXT React demo component
│   └── main.tsx # React popup entry point and application bootstrapping
├── shared/ # 11 directories
│   ├── analysis/ # 4 files
│   │   ├── candidate-ranking.ts # Content candidate scoring and ranking algorithms
│   │   ├── content-filtering.ts # Text filtering and content cleaning utilities
│   │   ├── heuristics-orchestrator.ts # Phase 1 content analysis orchestration engine
│   │   └── qualifier-rules.ts # Metadata qualification rules and enrichment logic
│   ├── classification/ # 1 file
│   │   └── file-types.ts # File type detection from MIME and extensions
│   ├── context/ # 1 file
│   │   └── page-analyzer.ts # Page context extraction and URL analysis utilities
│   ├── debug/ # 4 files
│   │   ├── console-helpers.ts # Console helper functions for debugging
│   │   ├── logger.ts # Debug logging utilities for troubleshooting rename decisions
│   │   ├── types.ts # Debug types and interfaces for troubleshooting rename decisions
│   │   └── verbose-formatter.ts # Verbose debug formatting utilities
│   ├── history/ # 1 file
│   │   └── history.ts # File renaming action history tracking and storage
│   ├── lifecycle/ # 1 file
│   │   └── install-tracking.ts # Extension installation date tracking and storage utilities
│   ├── messaging/ # 1 file
│   │   └── content-messages.ts # Message type definitions for content-background communication
│   ├── naming/ # 1 file
│   │   └── policy-engine.ts # Filename generation policies and formatting rules
│   ├── pipeline/ # 1 file
│   │   └── phase1-coordinator.ts # Phase 1 renaming pipeline coordination and orchestration
│   ├── settings/ # 2 files
│   │   ├── settings.ts # Application settings persistence and state management
│   │   └── types.ts # Type definitions for application configuration and settings
│   └── state/ # 1 file
│       └── page-context-store.ts # Runtime page context storage and management
├── background.ts # Background service worker for download interception and renaming
└── content.ts # Content script for page context extraction and messaging
```

<!-- AUTO-GENERATED TREE END -->
