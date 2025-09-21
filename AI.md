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
- Keep tree green; fix lints and types

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
│   ├── App.tsx # 1 export
│   └── main.tsx # Module exports
├── background.ts # 1 export
└── content.ts # 1 export
```

<!-- AUTO-GENERATED TREE END -->
