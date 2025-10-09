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
background/ # 7 files, 1 directories
  ├─ toast/ # 3 files
  │ ├─ confirmation-controller.ts # Confirm toast controller manages pending confirmation requests and routing.
  │ ├─ status-broadcaster.ts # Status broadcasting utilities for confirm toast updates.
  │ └─ target-resolver.ts # Tab resolution utilities for confirm toast targeting.
  ├─ confirm-toast-controller.ts # Confirm toast controller manages pending confirmation requests and routing.
  ├─ download-coordinator.ts # Download coordination logic for onDeterminingFilename events
  ├─ download-tracking.ts # Download tracking helpers used by the background coordinator.
  ├─ media-orchestrator.ts # Media analysis orchestration and upgrade proposal generation
  ├─ rename-overlay.ts # Helper for sending rename-complete overlay notifications to the initiating tab.
  ├─ settings-cache.ts # Settings cache management for background service worker
  └─ suggest-controller.ts # Helper for coordinating the Chrome downloads suggest callback with timeouts.
offscreen/ # 3 files, 1 directories
  ├─ bridge/ # 3 files
  │ ├─ sandbox-lifecycle.ts # Sandbox iframe lifecycle management
  │ ├─ sandbox-protocol.ts # Type-safe protocol definitions for Offscreen ↔ Sandbox (iframe) communication. Uses window.postMessage for parent-iframe IPC (browser standard).
  │ └─ stream-coordinator.ts # Streaming coordinator for range-based media fetching
  ├─ main.ts # Module exports
  ├─ media-analysis-handler.ts # 1 export
  └─ sandbox-bridge.ts # Bridge for communicating with the sandboxed iframe that runs MediaInfo.js. Coordinates analysis requests and response handling.
popup/ # 2 files
  ├─ App.tsx # Settings popup for configuring deterministic Instant Baseline strategies
  └─ main.tsx # React popup entry point and application bootstrapping
sandbox/ # 1 file
  └─ main.ts # Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.
shared/ # 15 directories
  ├─ classification/ # 2 files
  │ ├─ file-types.ts # File type detection from MIME and extensions
  │ └─ sensitive-content.ts # Sensitive content detection heuristics for confirmation routing.
  ├─ constants/ # 1 file
  │ └─ file-constants.ts # Shared file-related constants used across the application
  ├─ context/ # 1 file
  │ └─ page-analyzer.ts # Page context extraction and URL analysis utilities
  ├─ debug/ # 4 files
  │ ├─ console-helpers.ts # Console helper functions for debugging
  │ ├─ logger.ts # Debug logging utilities for troubleshooting rename decisions
  │ ├─ types.ts # Debug types and interfaces for troubleshooting rename decisions
  │ └─ verbose-formatter.ts # Verbose debug formatting utilities
  ├─ history/ # 1 file
  │ └─ history.ts # File renaming action history tracking and storage
  ├─ integrations/ # 1 directory
  │ └─ mediainfo/ # 9 files, 1 directories
  │   ├─ parsers/ # 2 files
  │   │ ├─ duration-parser.ts # Duration parsing utilities for MediaInfo track data
  │   │ └─ track-parser.ts # Track parsing utilities for MediaInfo video and audio tracks
  │   ├─ constants.ts # Centralized constants for MediaInfo integration and analysis pipeline.
  │   ├─ debug.ts # Debug logging utilities for media analysis pipeline
  │   ├─ index.ts # Main entry point for MediaInfo integration and media file analysis
  │   ├─ media-analysis-queue.ts # Queue manager for sequential media analysis requests
  │   ├─ media-summary.ts # MediaInfo result summarization and metadata extraction
  │   ├─ mediainfo-loader.ts # MediaInfo.js WASM loader and instance management
  │   ├─ messages.ts # Type definitions for media analysis request/response protocol
  │   ├─ offscreen-coordinator.ts # Offscreen document lifecycle and readiness coordination
  │   └─ range-reader.ts # HTTP Range request reader for efficient partial file fetching
  ├─ lifecycle/ # 1 file
  │ └─ install-tracking.ts # Extension installation date tracking and storage utilities
  ├─ messaging/ # 1 file
  │ └─ extension-messaging.ts # Central extension messaging protocol using @webext-core/messaging
  ├─ naming/ # 2 files
  │ ├─ media-qualifiers.ts # Extract media metadata qualifiers for filename enhancement
  │ └─ policy-engine.ts # Filename generation policies and formatting rules
  ├─ pipeline/ # 6 files
  │ ├─ filename-composer.ts # Filename composition and building utilities for Instant Baseline processing
  │ ├─ instant-baseline-strategy.ts # Instant Baseline deterministic strategy evaluator
  │ ├─ instant-baseline-types.ts # Shared Instant Baseline decision types
  │ ├─ path-utils.ts # Path and filename manipulation utilities for Instant Baseline processing
  │ ├─ strategy-evaluator.ts # Strategy evaluation and decision logic for Instant Baseline processing
  │ └─ strategy-options.ts # Strategy option definitions for the Instant Baseline domain
  ├─ settings/ # 6 files
  │ ├─ confirm-toast-routing.ts # Helper utilities for deciding whether the confirm toast should appear.
  │ ├─ settings.ts # Application settings persistence and state management
  │ ├─ storage-state.ts # Internal storage adapter state management for testing
  │ ├─ testing.ts # Test utilities for settings module
  │ ├─ types.ts # Type definitions for application configuration and settings
  │ └─ validation.ts # Settings validation and sanitization functions
  ├─ state/ # 2 files
  │ ├─ page-context-service.ts # Proxy service exposing PageContext store operations to other extension contexts.
  │ └─ page-context-store.ts # Runtime page context storage and management
  ├─ toast/ # 2 files
  │ ├─ timing-constants.ts # Centralized timing constants for toast behavior. All values are in milliseconds unless otherwise noted.
  │ └─ types.ts # Shared types for confirm toast messaging between contexts.
  ├─ ui/ # 5 files, 1 directories
  │ ├─ toast/ # 8 files
  │ │ ├─ keyboard-handler.ts # Keyboard event handler for toast interactions.
  │ │ ├─ rename-toast.tsx # RenameToast component displays confirmation feedback for applied renames.
  │ │ ├─ toast-action-handler.ts # Action handler for user interactions with toasts.
  │ │ ├─ toast-container.ts # Toast container and Shadow DOM creation utilities.
  │ │ ├─ toast-lifecycle.ts # Toast lifecycle management utilities for timer and removal handling.
  │ │ ├─ toast-overlay.tsx # ToastOverlay renders both confirm and rename toasts in a fixed overlay.
  │ │ ├─ toast-state-manager.ts # State management for confirm and rename toasts.
  │ │ └─ toast-theme-manager.ts # Theme management for toast UI elements.
  │ ├─ confirm-toast-manager.tsx # Toast manager rendered inside the content script via Shadow DOM.
  │ ├─ ConfirmToast.tsx # 1 export
  │ ├─ FilenameLabel.tsx # 1 export
  │ ├─ icons.ts # Shared icon exports for consistent icon usage across the application. All icons are re-exported from @heroicons/react for easy replacement if needed.
  │ └─ theme-service.ts # Theme management application service Handles automatic theme detection and daily reset logic
  └─ utils/ # 2 files
    ├─ filename.ts # Utility helpers for working with file names.
    └─ id.ts # Utility helpers for generating identifiers.
background.ts # Background service worker for download interception and renaming
content.ts # Content script for page context extraction and messaging
```

<!-- AUTO-GENERATED TREE END -->
