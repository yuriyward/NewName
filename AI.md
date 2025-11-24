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
ai-model-setup/ # 7 files, 2 directories
  ├─ components/ # 11 files
  │ ├─ alerts.tsx # 4 exports
  │ ├─ ArcadeEmbed.tsx # 1 export
  │ ├─ CopyableUrl.tsx # 1 export
  │ ├─ DiagnosticsSection.tsx # 1 export
  │ ├─ ModelStatusCard.tsx # 1 export
  │ ├─ SectionErrorBoundary.tsx # 1 export
  │ ├─ SetupChecklistSection.tsx # 1 export
  │ ├─ StatusAlertsSection.tsx # 2 exports
  │ ├─ SuccessModal.tsx # 2 exports
  │ ├─ TroubleshootingSection.tsx # 1 export
  │ └─ VideoTutorialSection.tsx # 1 export
  ├─ hooks/ # 4 files
  │ ├─ useDownloadETA.ts # 2 exports
  │ ├─ useLanguageDetectorAutoRetry.ts # 1 export
  │ ├─ useModelStatusSubscription.ts # 1 export
  │ └─ useSetupStateSubscription.ts # 1 export
  ├─ AIModelSetupPage.tsx # 1 export
  ├─ constants.ts # 9 exports
  ├─ event-handlers.ts # 3 exports
  ├─ main.tsx # React app entry point for AI model onboarding flow
  ├─ setup-handlers.ts # 4 exports
  ├─ types.ts # 4 exports
  └─ utils.ts # 13 exports
background/ # 11 files, 2 directories
  ├─ toast/ # 4 files
  │ ├─ confirmation-controller.ts # Confirm toast controller manages pending confirmation requests and routing.
  │ ├─ status-broadcaster.ts # Status broadcasting utilities for confirm toast updates.
  │ ├─ tab-activation-broadcaster.ts # Tab activation broadcaster for re-displaying pending toasts on newly active tabs.
  │ └─ target-resolver.ts # Tab resolution utilities for confirm toast targeting.
  ├─ upgrade/ # 16 files
  │ ├─ applyMetadataUpgrade.ts # Applies metadata-based upgrade proposals Entry point for metadata upgrades from UI interactions
  │ ├─ applySilentRename.ts # Applies silent renames for high-confidence or metadata-based upgrades
  │ ├─ cloud-consent-manager.ts # 3 exports
  │ ├─ coordinator.ts # Contextual upgrade coordinator for completed downloads Owns the complete upgrade workflow: - Entry point for download completion events and scheduled analyses - Eligibility checking - Delegates analysis to processor - Updates history and displays results
  │ ├─ eligibility.ts # Eligibility checks for contextual upgrade analysis
  │ ├─ handleUpgradeProposal.ts # Handles upgrade proposal processing and application Orchestrates the complete upgrade workflow by delegating to specialized handlers
  │ ├─ image-analysis-request.ts # Image upgrade analysis request builder Determines image eligibility and creates analysis requests
  │ ├─ mock-analysis.ts # Mock AI-powered contextual upgrade proposal generator
  │ ├─ normalization.ts # 6 exports
  │ ├─ pdf-analysis-request.ts # PDF upgrade analysis request builder Determines PDF eligibility and creates analysis requests
  │ ├─ queueUpgradeToast.ts # Queues upgrade confirmation toasts for user approval
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
  ├─ image-analysis/ # 10 files
  │ ├─ image-description.ts # Image description generation using Prompt API Generates concise multi-sentence descriptions of image content
  │ ├─ image-ingestion.ts # Image ingestion utilities for preparing images for Prompt API analysis Handles file reading, ImageBitmap creation, downscaling, and PNG encoding
  │ ├─ image-rename-decision-prompts.ts # Prompt building logic for image rename decisions. Constructs prompts that evaluate if an image filename needs improvement. SECURITY: Filename is sanitized, description is AI-generated (no sanitization needed). Page context is already sanitized by the formatter.
  │ ├─ image-rename-decision-types.ts # Type definitions for image rename decision analysis.
  │ ├─ image-rename-decision.ts # Image rename decision logic using Prompt API Decides if an image filename needs renaming based on description and metadata SECURITY: All untrusted inputs (filename, description) are sanitized. Description is AI-generated but could potentially encode adversarial instructions. Page context is already sanitized by the formatter.
  │ ├─ model-availability.ts # Multimodal AI model availability checking Handles Prompt API readiness verification for image analysis
  │ ├─ phase3-filename-generation.ts # Phase 3: Filename Generation (extracted from pipeline for reuse) Generates filename stem based on content description Can be called independently by other pipelines (e.g., PDF) Note: This is a thin wrapper around buildProposalFromPhase3Inputs The stem generation is the only unique logic; proposal building is shared.
  │ ├─ pipeline-orchestrator.ts # Image upgrade pipeline orchestrator Coordinates image analysis: ingestion → description → decision → filename generation
  │ ├─ pipeline-phases.ts # Image upgrade pipeline phases Coordinates the three-phase analysis: describe → decide → generate
  │ └─ proposal-builder.ts # Image upgrade proposal building Constructs the final upgrade proposal with all metadata
  ├─ pdf-analysis/ # 10 files
  │ ├─ constants.ts # Constants for PDF analysis and rendering
  │ ├─ pdf-analysis-pipeline.ts # PDF upgrade analysis pipeline orchestrator Coordinates PDF analysis: extraction → title/description → rename decision → filename generation Parallels the image analysis pipeline structure for consistency
  │ ├─ pdf-canvas-utils.ts # Canvas conversion utilities for PDF rendering Converts OffscreenCanvas to PNG blobs with quality settings
  │ ├─ pdf-context-merger.ts # PDF context merger for combining analysis from multiple pages Creates enhanced context for filename generation based on extracted titles and descriptions SECURITY: Titles and descriptions are AI-generated by our own model (pdf-title-description.ts) and do not need sanitization. Only untrusted inputs (filenames, URLs) need sanitization.
  │ ├─ pdf-page-extractor.ts # PDF page extraction and preparation for image analysis High-level coordinator that combines rendering and preparation stages Lower-level rendering pipeline: - pdf-page-renderer.ts: Core MuPDF rendering (document → pixmap → canvas) - pdf-canvas-utils.ts: Canvas conversion (canvas → PNG blob) - Internal extractPdfPages: Orchestrates page rendering with timeouts
  │ ├─ pdf-page-renderer.ts # Core PDF page rendering to OffscreenCanvas Handles MuPDF rendering pipeline: document → page → pixmap → PNG → canvas
  │ ├─ pdf-rename-decision.ts # PDF-specific Phase 2: Rename Decision Decides if a PDF should be renamed based on extracted title and content Separate from image pipeline to properly handle document titles
  │ ├─ pdf-renderer.ts # PDF renderer public API with file validation Exports main entry point for rendering PDF files to images
  │ ├─ pdf-title-description.ts # PDF-specific Phase 1: Extract exact titles and detailed descriptions from PDF pages This is separate from image analysis - PDFs only Analyzes both pages to find document titles and gather comprehensive context
  │ └─ types.ts # Type definitions for PDF analysis pipeline
  ├─ text-analysis/ # 15 files
  │ ├─ constants.ts # Text analysis constants for language detection and summarization. These values define thresholds and limits for AI processing.
  │ ├─ filename-builder.ts # 6 exports
  │ ├─ filename-generation-prompts.ts # Prompt building logic for filename generation. Constructs structured prompts that guide AI models to generate appropriate filenames. SECURITY: URL sanitization is applied to page context URLs. Other page context fields (title, heading) are already sanitized in buildBaseContextDescription.
  │ ├─ filename-generation-types.ts # Type definitions for filename generation. Shared types used across generation, validation, and prompt modules.
  │ ├─ filename-generation-validator.ts # Validation logic for filename generation responses. Ensures generated filenames meet structural and quality requirements.
  │ ├─ filename-generation.ts # Filename generation module using Chrome's Prompt API. This module generates new filename stems based on content analysis. It only runs AFTER the decision module determines that renaming is needed. SECURITY: All untrusted inputs (page context, summary) are sanitized via shared utilities.
  │ ├─ language-detection.ts # 2 exports
  │ ├─ pipeline-orchestrator.ts # Note: Offscreen contexts cannot persist debug settings, so we route all operational logs through offscreenLogger which is always enabled inside the offscreen document. Higher-severity warnings/errors still use the same logger so we have a single output path.
  │ ├─ prompt-helpers.ts # Shared utilities for Prompt API integration across decision and generation modules. These helpers provide common functionality for session management, availability checks, and response parsing. SECURITY: All untrusted inputs (filenames, content summaries) are sanitized to prevent prompt injection attacks.
  │ ├─ rename-decision-prompts.ts # Shared prompt text for the rename decision workflow.
  │ ├─ rename-decision-types.ts # 3 exports
  │ ├─ rename-decision-validation.ts # 1 export
  │ ├─ rename-decision.ts # Rename decision module using Chrome's Prompt API. This module decides whether a filename needs renaming by analyzing its quality against the file content. It uses a separate JSON schema focused purely on the decision logic, independent of filename generation. SECURITY: All untrusted inputs (filenames) are sanitized to prevent prompt injection.
  │ ├─ telemetry.ts # 6 exports
  │ └─ text-summarization.ts # Note: Offscreen contexts cannot persist debug toggles, so we log via offscreenLogger which is always enabled. This keeps operational telemetry available even when storage APIs are blocked.
  ├─ image-analysis-handler.ts # Offscreen image analysis request handler Handles image file reading, preparation, and AI analysis pipeline
  ├─ main.ts # Offscreen document initialization with media analysis handlers
  ├─ media-analysis-handler.ts # 1 export
  ├─ pdf-analysis-handler.ts # Offscreen PDF analysis request handler Handles PDF file extraction, page rendering, and image-based analysis
  ├─ sandbox-bridge.ts # Bridge for communicating with the sandboxed iframe that runs MediaInfo.js. Coordinates analysis requests and response handling.
  └─ text-analysis-handler.ts # 1 export
popup/ # 2 files, 3 directories
  ├─ components/ # 6 files, 1 directories
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
  │ ├─ ProcessingModeIndicator.tsx # 1 export
  │ └─ StrategyTab.tsx # 1 export
  ├─ hooks/ # 5 files
  │ ├─ useAiModelStatus.ts # 2 exports
  │ ├─ useDownloadsAccess.ts # 1 export
  │ ├─ useHistory.ts # 2 exports
  │ ├─ useManagedFolderPath.ts # 1 export
  │ └─ usePopupSettings.ts # 1 export
  ├─ onboarding/ # 1 file
  │ └─ DownloadsAccessScreen.tsx # Compact downloads access onboarding screen for popup
  ├─ App.tsx # Settings popup for configuring deterministic Instant Baseline strategies
  └─ main.tsx # React popup entry point and application bootstrapping
sandbox/ # 1 file
  └─ main.ts # Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.
settings/ # 2 files, 1 directories
  ├─ components/ # 3 files
  │ ├─ CloudAiSection.tsx # Cloud AI configuration section
  │ ├─ LocalAiModelSection.tsx # Local AI Models section Displays AI model status and provides access to model setup page Only visible when local AI processing is enabled (auto or local mode)
  │ └─ ProcessingPreferences.tsx # Per-file-type processing preferences
  ├─ main.tsx # Settings page entry point
  └─ SettingsPage.tsx # Settings page for cloud AI and processing preferences
shared/ # 18 directories
  ├─ classification/ # 2 files
  │ ├─ file-types.ts # File type detection from MIME and extensions
  │ └─ sensitive-content.ts # Sensitive content detection heuristics for confirmation routing.
  ├─ constants/ # 2 files
  │ ├─ confidence-thresholds.ts # Confidence thresholds for AI rename decisions shared across the codebase. The rename pipeline uses a three-tier scale: - `>= 0.8` ⟶ silent rename without showing a confirmation toast. - `>= 0.5` ⟶ confirmation toast with an auto-apply countdown. - `< 0.5`  ⟶ manual confirmation, no automatic actions. Keeping the thresholds and helpers here ensures every surface (toast routing, history entries, tests, etc.) speaks the same language. If we ever make them user-configurable we only need to touch this module.
  │ └─ file-constants.ts # Shared file-related constants used across the application
  ├─ context/ # 3 files
  │ ├─ context-updater.ts # Context update logic for content script Handles queuing, retrying, and dispatching page context updates
  │ ├─ page-analyzer.ts # 6 exports
  │ └─ page-context-formatter.ts # Page context formatting utilities for AI prompts Provides consistent formatting of page context (title, heading, URL) across all AI providers SECURITY: All inputs are sanitized to prevent prompt injection attacks. Page context values (title, heading, URL) come from untrusted web pages.
  ├─ debug/ # 5 files
  │ ├─ console-helpers.ts # Console helper functions for debugging
  │ ├─ logger.ts # Debug logging utilities for troubleshooting rename decisions
  │ ├─ offscreen-logger.ts # Offscreen Logger - Debugging utility for offscreen documents Provides logging for offscreen contexts where storage access is unavailable. Works independently without relying on chrome.storage or WXT storage APIs. Always enabled to ensure offscreen operations are visible during debugging. Usage in offscreen documents: - `offscreenLogger.log(message, data)` - Standard logging - `offscreenLogger.warn(message, data)` - Warning messages - `offscreenLogger.error(message, data)` - Error messages
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
  │ ├─ ai-provider/ # 9 files
  │ │ ├─ ai-router.ts # Smart AI Router Routes analysis requests to the appropriate provider (local or cloud) based on user preferences, provider availability, and fallback logic.
  │ │ ├─ cloud-adapter.ts # Cloud AI Adapter Integrates with cloud AI services (Google Gemini) via ai-sdk. Provides fallback/alternative to local Chrome AI processing. This adapter delegates to specialized analysis pipelines: - Text: cloud-text-analysis.ts - Image: cloud-image-analysis.ts - PDF: cloud-pdf-analysis.ts
  │ │ ├─ cloud-image-analysis.ts # Cloud Image Analysis Pipeline Handles image analysis using Google Gemini via ai-sdk. Implements three-phase analysis: description → decision → generation SECURITY: All untrusted inputs (filename, AI-generated description) are sanitized.
  │ │ ├─ cloud-pdf-analysis.ts # Cloud PDF Analysis Pipeline Handles PDF analysis using Google Gemini via ai-sdk. Implements three-phase analysis: title extraction → decision → generation SECURITY: All untrusted inputs (filename, extracted titles) are sanitized. Note: mergePdfContext already sanitizes extracted titles and descriptions.
  │ │ ├─ cloud-text-analysis.ts # Cloud Text Analysis Pipeline Handles text analysis using Google Gemini via ai-sdk. Implements two-phase analysis: decision → generation SECURITY: All untrusted inputs (filename, content, page context) are sanitized.
  │ │ ├─ helpers.ts # Shared helpers for AI provider integrations
  │ │ ├─ local-adapter.ts # Local AI Adapter Wraps Chrome's built-in AI (Gemini Nano) for on-device processing. This adapter delegates to existing pipeline orchestrators without changing their logic.
  │ │ ├─ summary-builder.ts # AI Analysis Summary Builder Provides utilities for building comprehensive summaries from AI analysis results. These summaries combine multiple pieces of information (description, decision reasoning) into user-friendly explanations.
  │ │ └─ types.ts # AI Provider Abstraction Layer This module defines a unified interface for AI providers (local Chrome AI vs. cloud services). Allows seamless switching between on-device and cloud-based processing.
  │ ├─ chrome-ai/ # 10 files, 2 directories
  │ │ ├─ diagnostics-rules/ # 6 files
  │ │ │ ├─ chrome-version-rule.ts # 2 exports
  │ │ │ ├─ flags-enabled-rule.ts # 2 exports
  │ │ │ ├─ hardware-requirements-rule.ts # 2 exports
  │ │ │ ├─ optimization-guide-rule.ts # 2 exports
  │ │ │ ├─ os-support-rule.ts # 2 exports
  │ │ │ └─ wxt-dev-mode-rule.ts # 2 exports
  │ │ ├─ model-status/ # 6 files, 1 directories
  │ │ │ ├─ download-handlers/ # 3 files
  │ │ │ │ ├─ language-detector.ts # 1 export
  │ │ │ │ ├─ language-model.ts # 1 export
  │ │ │ │ └─ summarizer.ts # 1 export
  │ │ │ ├─ status-cache.ts # 5 exports
  │ │ │ ├─ status-preparation.ts # 2 exports
  │ │ │ ├─ status-probe.ts # 2 exports
  │ │ │ ├─ status-types.ts # 9 exports
  │ │ │ ├─ status-utils.ts # 21 exports
  │ │ │ └─ watchdog-manager.ts # 5 exports
  │ │ ├─ adapter.ts # 9 exports
  │ │ ├─ diagnostics.ts # Diagnostic utilities for Chrome built-in AI troubleshooting. Identifies specific failure modes and provides targeted fix instructions.
  │ │ ├─ ensure-local-ai-setup.ts # Utilities for checking and ensuring local AI setup is complete. Used across Settings and Downloads Permission screens to guide users through AI setup.
  │ │ ├─ language-helpers.ts # Shared helpers for normalising and resolving language preferences when interacting with Chrome's built-in AI surfaces.
  │ │ ├─ model-status-service.ts # Proxy service for AI model status management. Ensures model availability checks and downloads run in the background context where storage access is guaranteed.
  │ │ ├─ model-status.ts # 12 exports
  │ │ ├─ setup-state.ts # 8 exports
  │ │ ├─ telemetry.ts # 10 exports
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
  │ │ └─ types.ts # 13 exports
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
  ├─ pipeline/ # 7 files
  │ ├─ datetime-prefix.ts # Datetime prefix utilities for AI Rename + date strategy Handles extraction and application of datetime prefixes in format: YYYY-MM-DD_HH-MM Examples: - "2025-11-18_14-30-report.pdf" - "2025-11-18_14-30_report.pdf" - "2025-11-18_14-30 report.pdf"
  │ ├─ filename-composer.ts # Filename composition and building utilities for Instant Baseline processing
  │ ├─ instant-baseline-strategy.ts # Instant Baseline deterministic strategy evaluator
  │ ├─ instant-baseline-types.ts # Shared Instant Baseline decision types
  │ ├─ path-utils.ts # Path and filename manipulation utilities for Instant Baseline processing
  │ ├─ strategy-evaluator.ts # Strategy evaluation and decision logic for Instant Baseline processing
  │ └─ strategy-options.ts # Strategy option definitions for the Instant Baseline domain
  ├─ settings/ # 8 files
  │ ├─ confirm-toast-routing.ts # Helper utilities for deciding whether the confirm toast should appear.
  │ ├─ crypto.test-helper.ts # Fast mock crypto implementation for testing Bypasses expensive PBKDF2 and AES operations while maintaining format compatibility
  │ ├─ crypto.ts # Cryptographic utilities for secure API key storage Security Model: - Uses Web Crypto API (AES-GCM) for encryption - Derives encryption key from extension ID + salt using PBKDF2 - Provides obfuscation rather than true security (key is deterministic) - Better than plaintext: requires extension context access + code analysis - NOT secure against determined attackers with extension access Design Rationale: Browser extensions lack a secure key storage mechanism without user interaction. This implementation raises the security bar by: 1. Preventing casual inspection of API keys in storage 2. Requiring attackers to analyze extension code + have extension context 3. Using standard crypto primitives (AES-GCM, PBKDF2) Limitations: - Extension ID is public (in manifest) - Salt is in source code (public in unpacked extension) - Anyone with extension access can decrypt by running the same code - This is obfuscation + access control, not cryptographic security Format: - Encrypted data has format: "enc:v1:<base64>" - This makes it unambiguous and prevents false positives with API keys that look like base64
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
  ├─ ui/ # 10 files, 1 directories
  │ ├─ toast/ # 8 files
  │ │ ├─ keyboard-handler.ts # Keyboard event handler for toast interactions.
  │ │ ├─ rename-toast.tsx # RenameToast component displays confirmation feedback for applied renames. Simplified design matching ai/design/src/notification-examples.tsx
  │ │ ├─ toast-action-handler.ts # Action handler for user interactions with toasts.
  │ │ ├─ toast-container.ts # Toast container and Shadow DOM creation utilities.
  │ │ ├─ toast-lifecycle.ts # Toast lifecycle management utilities for timer and removal handling.
  │ │ ├─ toast-overlay.tsx # ToastOverlay renders both confirm and rename toasts in a fixed overlay.
  │ │ ├─ toast-state-manager.ts # State management for confirm and rename toasts.
  │ │ └─ toast-theme-manager.ts # Theme management for toast UI elements.
  │ ├─ badge-manager.ts # 4 exports
  │ ├─ confirm-toast-manager.test.tsx # Tests for toast manager lifecycle and interactions
  │ ├─ confirm-toast-manager.tsx # Toast manager rendered inside the content script via Shadow DOM.
  │ ├─ ConfirmToast.accessibility.test.tsx # Accessibility tests for confirm toast component
  │ ├─ ConfirmToast.tsx # 1 export
  │ ├─ CountdownBadge.tsx # Countdown badge component Displays the auto-apply countdown with color changes when urgent
  │ ├─ FilenameLabel.tsx # 1 export
  │ ├─ theme-service.ts # Theme management application service Handles automatic theme detection and daily reset logic
  │ ├─ useToastCountdown.ts # Countdown timer hooks for auto-apply toast
  │ └─ useToastEditor.ts # Editor hooks for toast filename editing Simplified for hover-based edit mode
  └─ utils/ # 6 files
    ├─ encoding.ts # Lightweight text encoding helpers used during file ingestion.
    ├─ filename.ts # Utility helpers for working with file names.
    ├─ id.ts # Utility helpers for generating identifiers.
    ├─ prompt-sanitization.ts # Prompt sanitization utilities to prevent prompt injection attacks. All untrusted inputs (filenames, URLs, page content, extracted text) must be sanitized before being inserted into AI prompts.
    ├─ retry.ts # 5 exports
    └─ tab-eligibility.ts # Utility helpers for checking tab eligibility for content script injection.
background.ts # Background service worker for download interception and renaming
content.ts # Content script for page context extraction and messaging
```

<!-- AUTO-GENERATED TREE END -->
