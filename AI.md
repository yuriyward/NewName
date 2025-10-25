# AGENTS.md

This file provides guidance to AI agents working with this repository.

## Project Overview

This is a browser extension (WXT + React 19) that intelligently cleans up messy file names. It helps users automatically rename files to descriptive, human-readable names at save time or on demand, while detecting which files actually need renaming.

### Core Capabilities
- Smart file name analysis and pattern detection
- Suggested file names with context-aware templates
- Auto-rename flows with undo/preview support
- Post-download file renaming via File System Access API
- Post-download file analysis via MediaInfo.js WASM
- Post-download file analysis via built-in AI
- Scoped rules per folder and project
- Activity history and quick revert

### Rename Pipeline (Two-Phase)
- Phase 1: Instant Baseline - Synchronous, deterministic strategies
- Phase 2: Contextual Upgrade - Asynchronous, AI-enhanced

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

### Reuse-First Development

Always search before building new functionality:
- Scan `entrypoints/shared/` for existing utilities (validation, parsing, async, dates/formatters).
- Extend existing helpers when possible; avoid duplication.
- If adding a new utility that could be reused, place it under the appropriate domain directory.

#### File Structure Guidelines

- Keep files under 300 lines; split when exceeding scope.
- Limit to 3 concerns per file; extract helpers for clarity.
- Extract shared logic after 2+ uses.

### Storage Strategy

- **IndexedDB** (`idb-keyval`) - File System Access handles, large blobs
- **WXT Storage** (`storage` from WXT) - Settings, preferences, history

## Static references

- `WebExt-Core.md` - @webext-core patterns (messaging, storage, proxy services)
- `ai-chrome-*.md` - Chrome Built-in AI APIs (Prompt, Summarizer, Language Detection)
- `mediainfo-research.md` - MediaInfo.js integration patterns
- `chrome-service-worker-long-running-tasks.md` - Alarms API for persistent operations

## AI-Generated Documentation Hub

The `ai/` directory hosts both static and auto-generated docs.
- `ai/docs/README.md` - docs index
- `ai/docs/FILE-STRUCTURE.md` - auto-generated from code via TypeDoc
- Script: `bun run docs` (or `node scripts/generate-structure-docs.js`)

<!-- AUTO-GENERATED TREE START -->

```
ai-model-setup/ # 5 files, 1 directories
  ├─ components/ # 4 files
  │ ├─ alerts.tsx # 4 exports
  │ ├─ CopyableUrl.tsx # 1 export
  │ ├─ DiagnosticsSection.tsx # 1 export
  │ └─ ModelStatusCard.tsx # 1 export
  ├─ AIModelSetupPage.tsx # 1 export
  ├─ constants.ts # 6 exports
  ├─ main.tsx # React app entry point for AI model onboarding flow
  ├─ types.ts # 4 exports
  └─ utils.ts # 11 exports
background/ # 11 files, 2 directories
  ├─ toast/ # 4 files
  │ ├─ confirmation-controller.ts # Confirm toast controller manages pending confirmation requests and routing.
  │ ├─ status-broadcaster.ts # Status broadcasting utilities for confirm toast updates.
  │ ├─ tab-activation-broadcaster.ts # Tab activation broadcaster for re-displaying pending toasts on newly active tabs.
  │ └─ target-resolver.ts # Tab resolution utilities for confirm toast targeting.
  ├─ upgrade/ # 12 files
  │ ├─ cloud-consent-manager.ts # 3 exports
  │ ├─ coordinator.ts # Contextual upgrade coordinator for completed downloads Owns the complete upgrade workflow: - Entry point for download completion events and scheduled analyses - Eligibility checking - Delegates analysis to processor - Updates history and displays results
  │ ├─ eligibility.ts # Eligibility checks for contextual upgrade analysis
  │ ├─ image-analysis-request.ts # Image upgrade analysis request builder Determines image eligibility and creates analysis requests
  │ ├─ mock-analysis.ts # Mock AI-powered contextual upgrade proposal generator
  │ ├─ normalization.ts # 6 exports
  │ ├─ pdf-analysis-request.ts # PDF upgrade analysis request builder Determines PDF eligibility and creates analysis requests
  │ ├─ scheduler.ts # 4 exports
  │ ├─ text-analysis-request.ts # 1 export
  │ ├─ types.ts # Type definitions for contextual upgrade pipeline
  │ ├─ unified-analysis-requester.ts # Unified upgrade analysis router Routes to text or image analysis based on file type
  │ └─ upgrade-processor.ts # Upgrade analysis processor Handles the core upgrade analysis workflow: - Duplicate prevention - Download resolution - Analysis execution - Proposal normalization Does NOT handle: history updates, toast queueing (those belong to coordinator)
  ├─ download-coordinator.ts # Download coordination logic for onDeterminingFilename events
  ├─ download-plan.ts # Download plan builder with evaluation and path resolution
  ├─ download-post-actions.ts # Post-download actions for history recording and media analysis
  ├─ download-tracking.ts # Download tracking helpers used by the background coordinator.
  ├─ download-types.ts # Type definitions for download listener callbacks
  ├─ download-utils.ts # Download utility functions for file type checking
  ├─ media-orchestrator.ts # Media analysis orchestration and upgrade proposal generation
  ├─ rename-orchestrator.ts # Orchestrates file rename operations in response to toast actions.
  ├─ rename-overlay.ts # Helper for sending rename-complete overlay notifications to the initiating tab.
  ├─ settings-cache.ts # Settings cache management for background service worker
  └─ suggest-controller.ts # Helper for coordinating the Chrome downloads suggest callback with timeouts.
cloud-consent/ # 2 files
  ├─ CloudConsentPage.tsx # 1 export
  └─ main.tsx # Module exports
downloads-permission/ # 2 files
  ├─ DownloadsPermissionPage.tsx # Full-page downloads folder permission onboarding interface
  └─ main.tsx # React app entry point for downloads permission onboarding
offscreen/ # 6 files, 4 directories
  ├─ bridge/ # 3 files
  │ ├─ sandbox-lifecycle.ts # Sandbox iframe lifecycle management
  │ ├─ sandbox-protocol.ts # Type-safe protocol definitions for Offscreen ↔ Sandbox (iframe) communication. Uses window.postMessage for parent-iframe IPC (browser standard).
  │ └─ stream-coordinator.ts # Streaming coordinator for range-based media fetching
  ├─ image-analysis/ # 8 files
  │ ├─ image-description.ts # Image description generation using Prompt API Generates concise 1-2 sentence descriptions of image content
  │ ├─ image-ingestion.ts # Image ingestion utilities for preparing images for Prompt API analysis Handles file reading, ImageBitmap creation, downscaling, and PNG encoding
  │ ├─ image-rename-decision.ts # Image rename decision logic using Prompt API Decides if an image filename needs renaming based on description and metadata
  │ ├─ model-availability.ts # Multimodal AI model availability checking Handles Prompt API readiness verification for image analysis
  │ ├─ phase3-filename-generation.ts # Phase 3: Filename Generation (extracted from pipeline for reuse) Generates filename stem based on content description Can be called independently by other pipelines (e.g., PDF) Note: This is a thin wrapper around buildProposalFromPhase3Inputs The stem generation is the only unique logic; proposal building is shared.
  │ ├─ pipeline-orchestrator.ts # Image upgrade pipeline orchestrator Coordinates image analysis: ingestion → description → decision → filename generation
  │ ├─ pipeline-phases.ts # Image upgrade pipeline phases Coordinates the three-phase analysis: describe → decide → generate
  │ └─ proposal-builder.ts # Image upgrade proposal building Constructs the final upgrade proposal with all metadata
  ├─ pdf-analysis/ # 10 files
  │ ├─ constants.ts # Constants for PDF analysis and rendering
  │ ├─ pdf-analysis-pipeline.ts # PDF upgrade analysis pipeline orchestrator Coordinates PDF analysis: extraction → title/description → rename decision → filename generation Parallels the image analysis pipeline structure for consistency
  │ ├─ pdf-canvas-utils.ts # Canvas conversion utilities for PDF rendering Converts OffscreenCanvas to PNG blobs with quality settings
  │ ├─ pdf-context-merger.ts # PDF context merger for combining analysis from multiple pages Creates enhanced context for filename generation based on extracted titles and descriptions
  │ ├─ pdf-page-extractor.ts # PDF page extraction and preparation for image analysis High-level coordinator that combines rendering and preparation stages Lower-level rendering pipeline: - pdf-page-renderer.ts: Core MuPDF rendering (document → pixmap → canvas) - pdf-canvas-utils.ts: Canvas conversion (canvas → PNG blob) - Internal extractPdfPages: Orchestrates page rendering with timeouts
  │ ├─ pdf-page-renderer.ts # Core PDF page rendering to OffscreenCanvas Handles MuPDF rendering pipeline: document → page → pixmap → PNG → canvas
  │ ├─ pdf-rename-decision.ts # PDF-specific Phase 2: Rename Decision Decides if a PDF should be renamed based on extracted title and content Separate from image pipeline to properly handle document titles
  │ ├─ pdf-renderer.ts # PDF renderer public API with file validation Exports main entry point for rendering PDF files to images
  │ ├─ pdf-title-description.ts # PDF-specific Phase 1: Extract exact titles and detailed descriptions from PDF pages This is separate from image analysis - PDFs only Analyzes both pages to find document titles and gather comprehensive context
  │ └─ types.ts # Type definitions for PDF analysis pipeline
  ├─ text-analysis/ # 9 files
  │ ├─ constants.ts # Text analysis constants for language detection and summarization. These values define thresholds and limits for AI processing.
  │ ├─ filename-builder.ts # 6 exports
  │ ├─ filename-generation.ts # Filename generation module using Chrome's Prompt API. This module generates new filename stems based on content analysis. It only runs AFTER the decision module determines that renaming is needed.
  │ ├─ language-detection.ts # 2 exports
  │ ├─ pipeline-orchestrator.ts # Note: This file uses console.log() instead of debugLogger.log() for operational logs. Reason: Offscreen documents don't have storage access, so debugLogger.setEnabled() fails. AI processing logs are diagnostic/operational and should always be visible. We still use debugLogger.warn() and debugLogger.error() for warnings/errors.
  │ ├─ prompt-helpers.ts # Shared utilities for Prompt API integration across decision and generation modules. These helpers provide common functionality for session management, availability checks, and response parsing.
  │ ├─ rename-decision.ts # Rename decision module using Chrome's Prompt API. This module decides whether a filename needs renaming by analyzing its quality against the file content. It uses a separate JSON schema focused purely on the decision logic, independent of filename generation.
  │ ├─ telemetry.ts # 6 exports
  │ └─ text-summarization.ts # Note: This file uses console.log() instead of debugLogger.log() for operational logs. Reason: Offscreen documents don't have storage access, so debugLogger.setEnabled() fails. AI processing logs are diagnostic/operational and should always be visible. We still use debugLogger.warn() and debugLogger.error() for warnings/errors.
  ├─ image-analysis-handler.ts # Offscreen image analysis request handler Handles image file reading, preparation, and AI analysis pipeline
  ├─ main.ts # Offscreen document initialization with media analysis handlers
  ├─ media-analysis-handler.ts # 1 export
  ├─ pdf-analysis-handler.ts # Offscreen PDF analysis request handler Handles PDF file extraction, page rendering, and image-based analysis
  ├─ sandbox-bridge.ts # Bridge for communicating with the sandboxed iframe that runs MediaInfo.js. Coordinates analysis requests and response handling.
  └─ text-analysis-handler.ts # 1 export
popup/ # 2 files, 3 directories
  ├─ components/ # 5 files, 1 directories
  │ ├─ HistoryTab/ # 5 files
  │ │ ├─ EmptyStateMessage.tsx # 1 export
  │ │ ├─ HistoryFilterButton.tsx # 1 export
  │ │ ├─ HistoryItem.tsx # 1 export
  │ │ ├─ SummaryDisplay.tsx # 1 export
  │ │ └─ utils.ts # 1 export
  │ ├─ AiModelBanner.tsx # 1 export
  │ ├─ HistoryTab.tsx # 1 export
  │ ├─ IconButton.tsx # 1 export
  │ ├─ PrimaryButton.tsx # 1 export
  │ └─ StrategyTab.tsx # 1 export
  ├─ hooks/ # 4 files
  │ ├─ useAiModelStatus.ts # 2 exports
  │ ├─ useDownloadsAccess.ts # 1 export
  │ ├─ useHistory.ts # 2 exports
  │ └─ usePopupSettings.ts # 1 export
  ├─ onboarding/ # 1 file
  │ └─ DownloadsAccessScreen.tsx # Compact downloads access onboarding screen for popup
  ├─ App.tsx # Settings popup for configuring deterministic Instant Baseline strategies
  └─ main.tsx # React popup entry point and application bootstrapping
sandbox/ # 1 file
  └─ main.ts # Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.
settings/ # 2 files, 1 directories
  ├─ components/ # 2 files
  │ ├─ CloudAiSection.tsx # Cloud AI configuration section
  │ └─ ProcessingPreferences.tsx # Per-file-type processing preferences
  ├─ main.tsx # Settings page entry point
  └─ SettingsPage.tsx # Settings page for cloud AI and processing preferences
shared/ # 18 directories
  ├─ classification/ # 2 files
  │ ├─ file-types.ts # File type detection from MIME and extensions
  │ └─ sensitive-content.ts # Sensitive content detection heuristics for confirmation routing.
  ├─ constants/ # 1 file
  │ └─ file-constants.ts # Shared file-related constants used across the application
  ├─ context/ # 1 file
  │ └─ page-analyzer.ts # 6 exports
  ├─ debug/ # 4 files
  │ ├─ console-helpers.ts # Console helper functions for debugging
  │ ├─ logger.ts # Debug logging utilities for troubleshooting rename decisions
  │ ├─ types.ts # Debug types and interfaces for troubleshooting rename decisions
  │ └─ verbose-formatter.ts # Verbose debug formatting utilities
  ├─ filesystem/ # 6 files
  │ ├─ directory-picker.ts # Directory picker and permission management for the File System Access API.
  │ ├─ file-reader.ts # Utilities for reading files from the File System Access API.
  │ ├─ handle-storage.ts # Persist and retrieve File System Access handles using IndexedDB. File system handles are structured-clone serialisable and must live in IndexedDB (not chrome.storage.local) so that they can be restored in offscreen documents and service workers.
  │ ├─ path-helpers.ts # Utilities for normalising download paths and managed subfolder prefixes.
  │ ├─ rename-operations.ts # Core file rename operations built on top of the File System Access API. Implements the copy+delete fallback until FileSystemHandle.move() ships for non-OPFS files. Supports nested paths, streaming for large files, and Windows reserved-name sanitisation.
  │ └─ types.ts # Shared types for File System Access operations and state.
  ├─ history/ # 4 files
  │ ├─ history.ts # File renaming action history tracking and storage orchestration. Keeps the public API focused while storage and validation live in dedicated modules.
  │ ├─ storage.ts # History storage operations with pruning and sanitization
  │ ├─ types.ts # Type definitions for history items and metadata
  │ └─ validation.ts # Runtime validation for history data integrity
  ├─ integrations/ # 1 files, 6 directories
  │ ├─ ai-provider/ # 4 files
  │ │ ├─ ai-router.ts # Smart AI Router Routes analysis requests to the appropriate provider (local or cloud) based on user preferences, provider availability, and fallback logic.
  │ │ ├─ cloud-adapter.ts # Cloud AI Adapter Integrates with cloud AI services (Google Gemini) via ai-sdk. Provides fallback/alternative to local Chrome AI processing.
  │ │ ├─ local-adapter.ts # Local AI Adapter Wraps Chrome's built-in AI (Gemini Nano) for on-device processing. This adapter delegates to existing pipeline orchestrators without changing their logic.
  │ │ └─ types.ts # AI Provider Abstraction Layer This module defines a unified interface for AI providers (local Chrome AI vs. cloud services). Allows seamless switching between on-device and cloud-based processing.
  │ ├─ chrome-ai/ # 9 files, 2 directories
  │ │ ├─ diagnostics-rules/ # 6 files
  │ │ │ ├─ chrome-version-rule.ts # 2 exports
  │ │ │ ├─ flags-enabled-rule.ts # 2 exports
  │ │ │ ├─ hardware-requirements-rule.ts # 2 exports
  │ │ │ ├─ optimization-guide-rule.ts # 2 exports
  │ │ │ ├─ os-support-rule.ts # 2 exports
  │ │ │ └─ wxt-dev-mode-rule.ts # 2 exports
  │ │ ├─ model-status/ # 5 files
  │ │ │ ├─ status-cache.ts # 5 exports
  │ │ │ ├─ status-preparation.ts # 2 exports
  │ │ │ ├─ status-probe.ts # 2 exports
  │ │ │ ├─ status-types.ts # 9 exports
  │ │ │ └─ status-utils.ts # 21 exports
  │ │ ├─ adapter.ts # Shared adapter interface for Chrome built-in AI APIs. The chrome team currently exposes several surface-specific APIs (Prompt, Summarizer, Language Detector). This adapter keeps our background/offscreen logic decoupled from the actual runtime implementation so we can swap the mock below with real bindings once the APIs are ready.
  │ │ ├─ diagnostics.ts # Diagnostic utilities for Chrome built-in AI troubleshooting. Identifies specific failure modes and provides targeted fix instructions.
  │ │ ├─ language-helpers.ts # Shared helpers for normalising and resolving language preferences when interacting with Chrome's built-in AI surfaces.
  │ │ ├─ model-status-service.ts # Proxy service for AI model status management. Ensures model availability checks and downloads run in the background context where storage access is guaranteed.
  │ │ ├─ model-status.ts # 12 exports
  │ │ ├─ setup-state.ts # 8 exports
  │ │ ├─ telemetry.ts # 9 exports
  │ │ ├─ test-mocks.ts # Test utilities for mocking Chrome AI model status functions. Provides reusable mocks for ensureAiModelsReady with happy path and error scenarios.
  │ │ └─ types.ts # 27 exports
  │ ├─ image-analysis/ # 2 files
  │ │ ├─ constants.ts # Centralized constants for image analysis integration and pipeline
  │ │ └─ types.ts # Type definitions for image analysis upgrade pipeline
  │ ├─ mediainfo/ # 8 files, 1 directories
  │ │ ├─ parsers/ # 2 files
  │ │ │ ├─ duration-parser.ts # Duration parsing utilities for MediaInfo track data
  │ │ │ └─ track-parser.ts # Track parsing utilities for MediaInfo video and audio tracks
  │ │ ├─ constants.ts # Centralized constants for MediaInfo integration and analysis pipeline.
  │ │ ├─ debug.ts # Debug logging utilities for media analysis pipeline
  │ │ ├─ index.ts # Main entry point for MediaInfo integration and media file analysis
  │ │ ├─ media-analysis-queue.ts # Queue manager for sequential media analysis requests
  │ │ ├─ media-summary.ts # MediaInfo result summarization and metadata extraction
  │ │ ├─ mediainfo-loader.ts # MediaInfo.js WASM loader and instance management
  │ │ ├─ messages.ts # Type definitions for media analysis request/response protocol
  │ │ └─ offscreen-coordinator.ts # Offscreen document lifecycle and readiness coordination
  │ ├─ mupdf/ # 1 file
  │ │ └─ mupdf-loader.ts # MuPDF WASM loader and instance management Configures MuPDF's WASM loading with proper fallbacks for dev/prod MuPDF auto-initializes on import, so we configure globalThis before importing
  │ ├─ text-analysis/ # 2 files
  │ │ ├─ normalize.ts # 3 exports
  │ │ └─ types.ts # 12 exports
  │ └─ range-fetcher.ts # Generic HTTP range fetch utilities shared across integrations. Designed to support resumable, partial reads without forcing the caller to download full files when the remote server advertises byte range support.
  ├─ lifecycle/ # 1 file
  │ └─ install-tracking.ts # Extension installation date tracking and storage utilities
  ├─ messaging/ # 4 files
  │ ├─ core-messages.ts # Core infrastructure messages Handles runtime context, offscreen lifecycle, and UI toast notifications
  │ ├─ extension-messaging.ts # Central extension messaging protocol using @webext-core/messaging This file defines the combined messaging protocol interface only. For message helpers and implementations, import directly from domain-specific files: - core-messages.ts: Runtime context, offscreen lifecycle, toast notifications - media-messages.ts: Image and PDF analysis - text-messages.ts: Text analysis, AI pipeline, cloud consent
  │ ├─ media-messages.ts # Media analysis messages (image and PDF) Handles image ingestion, PDF analysis, and media metadata extraction
  │ └─ text-messages.ts # Text analysis and AI pipeline messages Handles text ingestion, AI model management, telemetry, and cloud consent
  ├─ naming/ # 3 files
  │ ├─ media-qualifiers-constants.ts # Constants for media metadata qualifiers Enumerates standard resolutions, audio channels, and codec formats
  │ ├─ media-qualifiers.ts # Extract media metadata qualifiers for filename enhancement
  │ └─ policy-engine.ts # Filename generation policies and formatting rules
  ├─ onboarding/ # 1 file
  │ └─ onboarding-state.ts # Persistence helpers for onboarding progress shared across extension contexts.
  ├─ parsing/ # 1 file
  │ └─ summary-parser.ts # Summary parser for AI-generated contextual upgrade summaries. Handles structured and unstructured text formats from AI models.
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
  │ ├─ storage-state.ts # Storage adapter state management for settings module This module provides a testing override mechanism for the storage adapter. In production, it simply re-exports WXT's storage API. In tests, it allows mocking storage behavior without complex setup.
  │ ├─ testing.ts # Test utilities for settings module
  │ ├─ types.ts # Type definitions for application configuration and settings
  │ └─ validation.ts # Settings validation and sanitization functions
  ├─ state/ # 2 files
  │ ├─ page-context-service.ts # Proxy service exposing PageContext store operations to other extension contexts.
  │ └─ page-context-store.ts # Runtime page context storage and management
  ├─ toast/ # 2 files
  │ ├─ timing-constants.ts # Centralized timing constants for toast behavior. All values are in milliseconds unless otherwise noted.
  │ └─ types.ts # Shared types for confirm toast messaging between contexts.
  ├─ ui/ # 9 files, 1 directories
  │ ├─ toast/ # 8 files
  │ │ ├─ keyboard-handler.ts # Keyboard event handler for toast interactions.
  │ │ ├─ rename-toast.tsx # RenameToast component displays confirmation feedback for applied renames. Simplified design matching ai/design/src/notification-examples.tsx
  │ │ ├─ toast-action-handler.ts # Action handler for user interactions with toasts.
  │ │ ├─ toast-container.ts # Toast container and Shadow DOM creation utilities.
  │ │ ├─ toast-lifecycle.ts # Toast lifecycle management utilities for timer and removal handling.
  │ │ ├─ toast-overlay.tsx # ToastOverlay renders both confirm and rename toasts in a fixed overlay.
  │ │ ├─ toast-state-manager.ts # State management for confirm and rename toasts.
  │ │ └─ toast-theme-manager.ts # Theme management for toast UI elements.
  │ ├─ confirm-toast-manager.test.tsx # Tests for toast manager lifecycle and interactions
  │ ├─ confirm-toast-manager.tsx # Toast manager rendered inside the content script via Shadow DOM.
  │ ├─ ConfirmToast.accessibility.test.tsx # Accessibility tests for confirm toast component
  │ ├─ ConfirmToast.tsx # 1 export
  │ ├─ CountdownBadge.tsx # Countdown badge component Displays the auto-apply countdown with color changes when urgent
  │ ├─ FilenameLabel.tsx # 1 export
  │ ├─ theme-service.ts # Theme management application service Handles automatic theme detection and daily reset logic
  │ ├─ useToastCountdown.ts # Countdown timer hooks for auto-apply toast
  │ └─ useToastEditor.ts # Editor hooks for toast filename editing Simplified for hover-based edit mode
  └─ utils/ # 4 files
    ├─ encoding.ts # Lightweight text encoding helpers used during file ingestion.
    ├─ filename.ts # Utility helpers for working with file names.
    ├─ id.ts # Utility helpers for generating identifiers.
    └─ tab-eligibility.ts # Utility helpers for checking tab eligibility for content script injection.
background.ts # Background service worker for download interception and renaming
content.ts # Content script for page context extraction and messaging
```

<!-- AUTO-GENERATED TREE END -->
