# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

ai-model-setup/ # 5 files, 1 directories
  ├─ components/ # 6 files
  │ ├─ alerts.tsx # 4 exports
  │ ├─ CopyableUrl.tsx # 1 export
  │ ├─ DiagnosticsSection.tsx # 1 export
  │ ├─ ModelStatusCard.tsx # 1 export
  │ ├─ SectionErrorBoundary.tsx # 1 export
  │ └─ SetupChecklistSection.tsx # 1 export
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
  ├─ components/ # 2 files
  │ ├─ CloudAiSection.tsx # Cloud AI configuration section
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
  │ │ ├─ model-status/ # 5 files
  │ │ │ ├─ status-cache.ts # 5 exports
  │ │ │ ├─ status-preparation.ts # 2 exports
  │ │ │ ├─ status-probe.ts # 2 exports
  │ │ │ ├─ status-types.ts # 9 exports
  │ │ │ └─ status-utils.ts # 21 exports
  │ │ ├─ adapter.ts # 9 exports
  │ │ ├─ diagnostics.ts # Diagnostic utilities for Chrome built-in AI troubleshooting. Identifies specific failure modes and provides targeted fix instructions.
  │ │ ├─ ensure-local-ai-setup.ts # Utilities for checking and ensuring local AI setup is complete. Used across Settings and Downloads Permission screens to guide users through AI setup.
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
  └─ utils/ # 5 files
    ├─ encoding.ts # Lightweight text encoding helpers used during file ingestion.
    ├─ filename.ts # Utility helpers for working with file names.
    ├─ id.ts # Utility helpers for generating identifiers.
    ├─ prompt-sanitization.ts # Prompt sanitization utilities to prevent prompt injection attacks. All untrusted inputs (filenames, URLs, page content, extracted text) must be sanitized before being inserted into AI prompts.
    └─ tab-eligibility.ts # Utility helpers for checking tab eligibility for content script injection.
background.ts # Background service worker for download interception and renaming
content.ts # Content script for page context extraction and messaging

## File Details

### ai-model-setup/AIModelSetupPage.tsx
**Purpose**: 1 export

**Exports**:
- `export AIModelSetupPage` - item implementation

### ai-model-setup/components/CopyableUrl.tsx
**Purpose**: 1 export

**Exports**:
- `export CopyableUrl` - item implementation

### ai-model-setup/components/DiagnosticsSection.tsx
**Purpose**: 1 export

**Exports**:
- `export DiagnosticsSection` - item implementation

### ai-model-setup/components/ModelStatusCard.tsx
**Purpose**: 1 export

**Exports**:
- `export ModelStatusCard` - item implementation

### ai-model-setup/components/SectionErrorBoundary.tsx
**Purpose**: 1 export

**Exports**:
- `export SectionErrorBoundary` - Error boundary for section-level components in AI model s...

### ai-model-setup/components/SetupChecklistSection.tsx
**Purpose**: 1 export

**Exports**:
- `export SetupChecklistSection` - item implementation

### ai-model-setup/components/alerts.tsx
**Purpose**: 4 exports

**Exports**:
- `export InlineAlert` - item implementation
- `export LoadingCard` - item implementation
- `export PrerequisitesSection` - item implementation
- `export WxtDevModeAlert` - item implementation

### ai-model-setup/constants.ts
**Purpose**: 6 exports

**Exports**:
- `export INITIAL_STATUS_MAP` - item implementation
- `export MODEL_LABELS` - item implementation
- `export STATE_DESCRIPTIONS` - item implementation
- `export STATE_TONES` - item implementation
- `export SUPPORTED_PROMPT_OUTPUT_LANGUAGES` - item implementation
- `export createInitialProgressMap` - item implementation

### ai-model-setup/main.tsx
**Purpose**: React app entry point for AI model onboarding flow

*No exports found*

### ai-model-setup/types.ts
**Purpose**: 4 exports

**Exports**:
- `export ModelActionConfig` - item implementation
- `export ModelProgress` - item implementation
- `export SetupErrorDisplay` - item implementation
- `export StatusSnapshot` - item implementation

### ai-model-setup/utils.ts
**Purpose**: 11 exports

**Exports**:
- `export computeProgressPercent` - item implementation
- `export describeError` - item implementation
- `export detectPreferredLanguage` - item implementation
- `export formatRefreshSummary` - item implementation
- `export formatRelativeTime` - item implementation
- `export isAbortError` - item implementation
- `export isUserActivationIssue` - item implementation
- `export resolveModelAction` - item implementation
- `export resolveSetupErrorMessage` - item implementation
- `export resolveStaleBadge` - item implementation
- `export resolveSupportedPromptLanguage` - item implementation

### background.ts
**Purpose**: Background service worker for download interception and renaming

**Exports**:
- `export default` - item implementation

### background/download-coordinator.ts
**Purpose**: Download coordination logic for onDeterminingFilename events

**Exports**:
- `export createDeterminingListener` - Create the determining listener that processes download e...
- `export processDeterminingFilename` - Process the determining filename event and suggest a rena...

### background/download-plan.ts
**Purpose**: Download plan builder with evaluation and path resolution

**Exports**:
- `export DownloadPlan` - item implementation
- `export buildDownloadPlan` - item implementation

### background/download-post-actions.ts
**Purpose**: Post-download actions for history recording and media analysis

**Exports**:
- `export applyPostDownloadActions` - item implementation

### background/download-tracking.ts
**Purpose**: Download tracking helpers used by the background coordinator.

**Exports**:
- `export DownloadTrackingEntry` - Download tracking helpers used by the background coordina...
- `export pruneDownloadTrackingMap` - item implementation
- `export recordDownloadTracking` - item implementation
- `export resetDownloadTrackingForTesting` - item implementation

### background/download-types.ts
**Purpose**: Type definitions for download listener callbacks

**Exports**:
- `export DeterminingItem` - Type definitions for download listener callbacks
- `export DeterminingListener` - Type definitions for download listener callbacks
- `export SuggestCallback` - item implementation
- `export SuggestPayload` - item implementation

### background/download-utils.ts
**Purpose**: Download utility functions for file type checking

**Exports**:
- `export isMediaFileType` - Download utility functions for file type checking
- `export shouldRenameType` - item implementation

### background/media-orchestrator.ts
**Purpose**: Media analysis orchestration and upgrade proposal generation

**Exports**:
- `export applyMediaAnalysisResponse` - Apply media analysis response to history item and generat...
- `export toMediaDebugSettings` - Convert settings to media debug settings if debug is enabled

### background/rename-orchestrator.ts
**Purpose**: Orchestrates file rename operations in response to toast actions.

**Exports**:
- `export RenameOrchestratorHelpers` - item implementation
- `export executeAlwaysApply` - Execute "Always apply" action
- `export executeApply` - Execute rename for "Approve" action (or auto-apply)
- `export executeKeep` - Execute "Keep original" action

### background/rename-overlay.ts
**Purpose**: Helper for sending rename-complete overlay notifications to the initiating tab.

**Exports**:
- `export RenameOverlayOptions` - item implementation
- `export maybeShowRenameOverlay` - item implementation

### background/settings-cache.ts
**Purpose**: Settings cache management for background service worker

**Exports**:
- `export ensureSettingsCache` - Initialize a cached settings reader that automatically up...

### background/suggest-controller.ts
**Purpose**: Helper for coordinating the Chrome downloads suggest callback with timeouts.

**Exports**:
- `export SuggestController` - Helper for coordinating the Chrome downloads suggest call...
- `export createSuggestController` - item implementation

### background/toast/confirmation-controller.ts
**Purpose**: Confirm toast controller manages pending confirmation requests and routing.

**Exports**:
- `export ConfirmToastController` - item implementation
- `export ConfirmToastControllerHelpers` - item implementation
- `export ConfirmToastControllerHooks` - item implementation
- `export ConfirmToastEntry` - item implementation
- `export PendingToastSnapshot` - item implementation
- `export QueueConfirmToastOptions` - item implementation
- `export createConfirmToastController` - item implementation
- `export snapshotPendingToast` - Create a structured-clone-safe snapshot of a pending toas...

### background/toast/status-broadcaster.ts
**Purpose**: Status broadcasting utilities for confirm toast updates.

**Exports**:
- `export StatusBroadcastEntry` - item implementation
- `export emitStatus` - Emit status update to all tabs that have received this toast

### background/toast/tab-activation-broadcaster.ts
**Purpose**: Tab activation broadcaster for re-displaying pending toasts on newly active tabs.

**Exports**:
- `export TabActivationBroadcaster` - item implementation
- `export createTabActivationBroadcaster` - Create a tab activation broadcaster that re-displays pend...

### background/toast/target-resolver.ts
**Purpose**: Tab resolution utilities for confirm toast targeting.

**Exports**:
- `export extractTabId` - Extract tab ID from a target (either number or SendMessag...
- `export resolveTarget` - Resolve the active tab to use as the target for displayin...

### background/upgrade/applyMetadataUpgrade.ts
**Purpose**: Applies metadata-based upgrade proposals Entry point for metadata upgrades from UI interactions

**Exports**:
- `export ApplyMetadataUpgradeDeps` - item implementation
- `export ApplyMetadataUpgradeParams` - item implementation
- `export applyMetadataUpgrade` - item implementation

### background/upgrade/applySilentRename.ts
**Purpose**: Applies silent renames for high-confidence or metadata-based upgrades

**Exports**:
- `export ApplySilentRenameParams` - item implementation
- `export applySilentRename` - Applies a rename silently without user confirmation
Used ...

### background/upgrade/cloud-consent-manager.ts
**Purpose**: 3 exports

**Exports**:
- `export CloudConsentManager` - item implementation
- `export CloudConsentRequestContext` - item implementation
- `export createCloudConsentManager` - item implementation

### background/upgrade/coordinator.ts
**Purpose**: Contextual upgrade coordinator for completed downloads Owns the complete upgrade workflow: - Entry point for download completion events and scheduled analyses - Eligibility checking - Delegates analysis to processor - Updates history and displays results

**Exports**:
- `export UpgradeCoordinator` - item implementation
- `export createUpgradeCoordinator` - item implementation

### background/upgrade/eligibility.ts
**Purpose**: Eligibility checks for contextual upgrade analysis

**Exports**:
- `export UPGRADE_RECENT_WINDOW_MS` - Cooldown used to avoid re-running contextual upgrades imm...
- `export shouldAnalyzeUpgrade` - Determine whether a history item is eligible for contextu...

### background/upgrade/handleUpgradeProposal.ts
**Purpose**: Handles upgrade proposal processing and application Orchestrates the complete upgrade workflow by delegating to specialized handlers

**Exports**:
- `export HandleUpgradeProposalDeps` - item implementation
- `export HandleUpgradeProposalParams` - item implementation
- `export handleUpgradeProposal` - Orchestrates the upgrade proposal workflow
- Updates hist...

### background/upgrade/image-analysis-request.ts
**Purpose**: Image upgrade analysis request builder Determines image eligibility and creates analysis requests

**Exports**:
- `export createImageUpgradeAnalysisRequester` - Create image upgrade analysis requester function

### background/upgrade/mock-analysis.ts
**Purpose**: Mock AI-powered contextual upgrade proposal generator

**Exports**:
- `export requestMockUpgradeAnalysis` - item implementation

### background/upgrade/normalization.ts
**Purpose**: 6 exports

**Exports**:
- `export ResolveDownloadItemContext` - item implementation
- `export ResolveDownloadFailureReason` - item implementation
- `export ResolveDownloadResult` - item implementation
- `export normaliseDownloadItem` - item implementation
- `export normalizeProposal` - item implementation
- `export resolveDownloadItem` - item implementation

### background/upgrade/pdf-analysis-request.ts
**Purpose**: PDF upgrade analysis request builder Determines PDF eligibility and creates analysis requests

**Exports**:
- `export createPdfUpgradeAnalysisRequester` - Create PDF upgrade analysis requester function

### background/upgrade/queueUpgradeToast.ts
**Purpose**: Queues upgrade confirmation toasts for user approval

**Exports**:
- `export QueueUpgradeToastDeps` - item implementation
- `export QueueUpgradeToastParams` - item implementation
- `export queueUpgradeToast` - Queues a confirmation toast for an upgrade proposal
Used ...

### background/upgrade/scheduler.ts
**Purpose**: 4 exports

**Exports**:
- `export UpgradeScheduler` - item implementation
- `export UpgradeSchedulerDependencies` - item implementation
- `export BrowserAlarm` - item implementation
- `export createUpgradeScheduler` - item implementation

### background/upgrade/text-analysis-request.ts
**Purpose**: 1 export

**Exports**:
- `export createTextUpgradeAnalysisRequester` - item implementation

### background/upgrade/types.ts
**Purpose**: Type definitions for contextual upgrade pipeline

**Exports**:
- `export BrowserDownloadDelta` - item implementation
- `export BrowserDownloadItem` - Minimal subset of download item fields used by the upgrad...
- `export ScheduleUpgradeAnalysisParams` - item implementation
- `export UpgradeAnalysisInput` - item implementation
- `export UpgradeCoordinatorParams` - File type filtering happens inside eligibility.ts before ...
- `export UpgradeAnalysisSource` - item implementation
- `export MOCK_UPGRADE_ALARM_PREFIX` - item implementation

### background/upgrade/unified-analysis-requester.ts
**Purpose**: Unified upgrade analysis router Routes to text or image analysis based on file type

**Exports**:
- `export UnifiedAnalysisRequesterDependencies` - item implementation
- `export createUnifiedUpgradeAnalysisRequester` - Create a unified analysis requester that routes to text, ...

### background/upgrade/upgrade-processor.ts
**Purpose**: Upgrade analysis processor Handles the core upgrade analysis workflow: - Duplicate prevention - Download resolution - Analysis execution - Proposal normalization Does NOT handle: history updates, toast queueing (those belong to coordinator)

**Exports**:
- `export ProcessUpgradeAnalysisParams` - item implementation
- `export UpgradeProcessor` - item implementation
- `export UpgradeProcessorDependencies` - item implementation
- `export createUpgradeProcessor` - item implementation

### cloud-consent/CloudConsentPage.tsx
**Purpose**: 1 export

**Exports**:
- `export CloudConsentPage` - item implementation

### cloud-consent/main.tsx
**Purpose**: Module exports

*No exports found*

### content.ts
**Purpose**: Content script for page context extraction and messaging

**Exports**:
- `export default` - item implementation

### downloads-permission/DownloadsPermissionPage.tsx
**Purpose**: Full-page downloads folder permission onboarding interface

**Exports**:
- `export DownloadsPermissionPage` - item implementation

### downloads-permission/main.tsx
**Purpose**: React app entry point for downloads permission onboarding

*No exports found*

### offscreen/bridge/sandbox-lifecycle.ts
**Purpose**: Sandbox iframe lifecycle management

**Exports**:
- `export destroySandbox` - Destroy the sandbox iframe and cleanup resources
- `export ensureSandboxReady` - Ensure the sandbox iframe is ready and initialized
- `export getSandboxWindow` - Get the iframe content window for posting messages
- `export isFromSandbox` - Check if a message event is from the sandbox iframe

### offscreen/bridge/sandbox-protocol.ts
**Purpose**: Type-safe protocol definitions for Offscreen ↔ Sandbox (iframe) communication. Uses window.postMessage for parent-iframe IPC (browser standard).

**Exports**:
- `export ParentStreamResponses` - Messages sent from Parent (Offscreen) → Sandbox in respon...
- `export ParentToSandboxMessages` - Messages sent from Parent (Offscreen) → Sandbox (iframe)
- `export SandboxToParentMessages` - Messages sent from Sandbox (iframe) → Parent (Offscreen)
- `export TypedSandboxMessage` - Message event structure for typed message handling
- `export SandboxMessageProtocol` - Combined message protocol for all sandbox communication
- `export isSandboxMessage` - Type guard to check if a message event is from the expect...
- `export postToParent` - Send a typed message from sandbox (iframe) to parent (Off...
- `export postToSandbox` - Send a typed message from parent (Offscreen) to sandbox (...
- `export postToSandboxWithTransfer` - Send a typed message from parent (Offscreen) to sandbox w...

### offscreen/bridge/stream-coordinator.ts
**Purpose**: Streaming coordinator for range-based media fetching

**Exports**:
- `export cleanupReader` - Cleanup a specific reader by request ID
- `export cleanupStreamingListeners` - Cleanup streaming message listeners to prevent memory leaks
- `export registerStreamingListeners` - Register streaming message listeners for range-based fetc...

### offscreen/image-analysis-handler.ts
**Purpose**: Offscreen image analysis request handler Handles image file reading, preparation, and AI analysis pipeline

**Exports**:
- `export initializeImageAnalysisHandler` - Initialize the image analysis handler
Registers listener ...

### offscreen/image-analysis/image-description.ts
**Purpose**: Image description generation using Prompt API Generates concise multi-sentence descriptions of image content

**Exports**:
- `export ImageDescription` - item implementation
- `export describeImage` - Generate a concise description of image content using Pro...

### offscreen/image-analysis/image-ingestion.ts
**Purpose**: Image ingestion utilities for preparing images for Prompt API analysis Handles file reading, ImageBitmap creation, downscaling, and PNG encoding

**Exports**:
- `export ImageIngestionError` - item implementation
- `export ImageIngestionSuccess` - item implementation
- `export ImageIngestionOutput` - item implementation
- `export ingestImageForPrompt` - Ingest an image file for Prompt API analysis
Handles read...

### offscreen/image-analysis/image-rename-decision-prompts.ts
**Purpose**: Prompt building logic for image rename decisions. Constructs prompts that evaluate if an image filename needs improvement. SECURITY: Filename is sanitized, description is AI-generated (no sanitization needed). Page context is already sanitized by the formatter.

**Exports**:
- `export RENAME_DECISION_SYSTEM_PROMPT` - System prompt for image rename decision analysis
- `export buildDecisionPrompt` - Build decision prompt for image rename analysis

### offscreen/image-analysis/image-rename-decision-types.ts
**Purpose**: Type definitions for image rename decision analysis.

**Exports**:
- `export RenameDecision` - Image rename decision result with confidence and reasoning
- `export RenameDecisionParams` - Parameters for making a rename decision
- `export IMAGE_RENAME_DECISION_SCHEMA` - JSON Schema for enforcing structured output from the Prom...

### offscreen/image-analysis/image-rename-decision.ts
**Purpose**: Image rename decision logic using Prompt API Decides if an image filename needs renaming based on description and metadata SECURITY: All untrusted inputs (filename, description) are sanitized. Description is AI-generated but could potentially encode adversarial instructions. Page context is already sanitized by the formatter.

**Exports**:
- `export decideIfImageNeedsRename` - Decide if an image needs renaming based on its descriptio...

### offscreen/image-analysis/model-availability.ts
**Purpose**: Multimodal AI model availability checking Handles Prompt API readiness verification for image analysis

**Exports**:
- `export buildSessionCreationFailureResponse` - Build unavailability response when session creation fails...
- `export checkMultimodalAvailability` - Check if multimodal Prompt API is available and ready
Req...

### offscreen/image-analysis/phase3-filename-generation.ts
**Purpose**: Phase 3: Filename Generation (extracted from pipeline for reuse) Generates filename stem based on content description Can be called independently by other pipelines (e.g., PDF) Note: This is a thin wrapper around buildProposalFromPhase3Inputs The stem generation is the only unique logic; proposal building is shared.

**Exports**:
- `export generateFilenamePhase3` - Phase 3: Generate filename based on description and decis...

### offscreen/image-analysis/pipeline-orchestrator.ts
**Purpose**: Image upgrade pipeline orchestrator Coordinates image analysis: ingestion → description → decision → filename generation

**Exports**:
- `export runImageUpgradePipeline` - Run the complete image upgrade analysis pipeline
Returns ...

### offscreen/image-analysis/pipeline-phases.ts
**Purpose**: Image upgrade pipeline phases Coordinates the three-phase analysis: describe → decide → generate

**Exports**:
- `export DecidePhaseResult` - Phase 2 result: Rename decision
- `export DescribePhaseResult` - Phase 1 result: Image description with confidence
- `export GeneratePhaseResult` - Phase 3 result: Generated filename stem
- `export runDecidePhase` - Run PHASE 2: Rename Decision (Prompt API call #2)
Decide ...
- `export runDescribePhase` - Run PHASE 1: Describe Image (Prompt API call #1)
Generate...
- `export runGeneratePhase` - Run PHASE 3: Filename Generation (Prompt API call #3)
Gen...

### offscreen/image-analysis/proposal-builder.ts
**Purpose**: Image upgrade proposal building Constructs the final upgrade proposal with all metadata

**Exports**:
- `export buildProposalFromAnalysis` - Build proposal from analysis results
Constructs TextUpgra...
- `export buildProposalFromPhase3Inputs` - Build proposal from Phase 3 inputs (for direct Phase 3 ca...

### offscreen/main.ts
**Purpose**: Offscreen document initialization with media analysis handlers

*No exports found*

### offscreen/media-analysis-handler.ts
**Purpose**: 1 export

**Exports**:
- `export initializeMediaAnalysisHandler` - item implementation

### offscreen/pdf-analysis-handler.ts
**Purpose**: Offscreen PDF analysis request handler Handles PDF file extraction, page rendering, and image-based analysis

**Exports**:
- `export initializePdfAnalysisHandler` - Initialize the PDF analysis handler
Registers listener fo...

### offscreen/pdf-analysis/constants.ts
**Purpose**: Constants for PDF analysis and rendering

**Exports**:
- `export FIRST_PAGE_INDEX` - Page range to analyze - always start from page 1
- `export MAX_PDF_FILE_SIZE_BYTES` - Maximum file size for PDF analysis (50MB)
- `export MAX_PDF_PAGES` - Maximum number of pages to extract from PDF for image-bas...
- `export PDF_PAGE_IMAGE_FORMAT` - Target format for rendered pages
- `export PDF_PNG_QUALITY` - PNG quality for canvas-to-blob conversion (0-1 scale, hig...
- `export PDF_RENDER_SCALE` - Scale factor for rendering PDF pages to canvas (1
- `export PDF_RENDER_TIMEOUT_MS` - PDF rendering timeout per page (in milliseconds)

### offscreen/pdf-analysis/pdf-analysis-pipeline.ts
**Purpose**: PDF upgrade analysis pipeline orchestrator Coordinates PDF analysis: extraction → title/description → rename decision → filename generation Parallels the image analysis pipeline structure for consistency

**Exports**:
- `export runPdfUpgradePipeline` - Run the complete PDF upgrade analysis pipeline
PHASE 1: E...

### offscreen/pdf-analysis/pdf-canvas-utils.ts
**Purpose**: Canvas conversion utilities for PDF rendering Converts OffscreenCanvas to PNG blobs with quality settings

**Exports**:
- `export canvasToBlob` - Convert OffscreenCanvas to PNG blob

### offscreen/pdf-analysis/pdf-context-merger.ts
**Purpose**: PDF context merger for combining analysis from multiple pages Creates enhanced context for filename generation based on extracted titles and descriptions SECURITY: Titles and descriptions are AI-generated by our own model (pdf-title-description.ts) and do not need sanitization. Only untrusted inputs (filenames, URLs) need sanitization.

**Exports**:
- `export MergedPdfContext` - Merged PDF context ready for filename generation
This con...
- `export buildPdfContextForFilenameGeneration` - Build enhanced context string for filename generation
Thi...
- `export mergePdfContext` - Merge PDF page analysis results into context for filename...

### offscreen/pdf-analysis/pdf-page-extractor.ts
**Purpose**: PDF page extraction and preparation for image analysis High-level coordinator that combines rendering and preparation stages Lower-level rendering pipeline: - pdf-page-renderer.ts: Core MuPDF rendering (document → pixmap → canvas) - pdf-canvas-utils.ts: Canvas conversion (canvas → PNG blob) - Internal extractPdfPages: Orchestrates page rendering with timeouts

**Exports**:
- `export ExtractedPageForAnalysis` - Extracted page prepared for image analysis
- `export PdfPagePreparationError` - Error during PDF page extraction
- `export PdfPagePreparationResult` - Result of extracting and preparing PDF pages for image an...
- `export PdfPagePreparationOutput` - item implementation
- `export extractPdfPagesForAnalysis` - Extract PDF pages for image-based analysis
Renders pages ...

### offscreen/pdf-analysis/pdf-page-renderer.ts
**Purpose**: Core PDF page rendering to OffscreenCanvas Handles MuPDF rendering pipeline: document → page → pixmap → PNG → canvas

**Exports**:
- `export renderPageToCanvas` - Render a single PDF page to OffscreenCanvas at specified ...

### offscreen/pdf-analysis/pdf-rename-decision.ts
**Purpose**: PDF-specific Phase 2: Rename Decision Decides if a PDF should be renamed based on extracted title and content Separate from image pipeline to properly handle document titles

**Exports**:
- `export PdfRenameDecision` - Result of PDF rename decision
- `export decidePdfRename` - Decide if a PDF should be renamed based on extracted titl...

### offscreen/pdf-analysis/pdf-renderer.ts
**Purpose**: PDF renderer public API with file validation Exports main entry point for rendering PDF files to images

**Exports**:
- `export RenderPdfPagesError` - Error result for PDF rendering
- `export RenderPdfPagesSuccess` - Success result for PDF rendering
- `export RenderPdfPagesResult` - Error result for PDF rendering
- `export renderPdfPages` - Extract pages from PDF and render as PNG blobs

### offscreen/pdf-analysis/pdf-title-description.ts
**Purpose**: PDF-specific Phase 1: Extract exact titles and detailed descriptions from PDF pages This is separate from image analysis - PDFs only Analyzes both pages to find document titles and gather comprehensive context

**Exports**:
- `export PdfPageAnalysis` - Result of analyzing a single PDF page for title and descr...
- `export PdfTitleDescriptionContext` - Merged context from analyzing multiple PDF pages
- `export extractPdfTitlesAndDescriptions` - Analyze multiple PDF pages and extract titles and descrip...

### offscreen/pdf-analysis/types.ts
**Purpose**: Type definitions for PDF analysis pipeline

**Exports**:
- `export PdfAnalysisSuccess` - Successful PDF analysis with AI-generated proposal
- `export PdfPageExtractionError` - Error during PDF extraction
- `export PdfPageExtractionResult` - Result of extracting pages from a PDF
- `export PdfPageIngestionResult` - Successful PDF analysis response (pages ingested)
- `export PdfUpgradeAnalysisErrorResponse` - Error response from PDF analysis
- `export PdfUpgradeAnalysisRequest` - Request to analyze a PDF file via image recognition
- `export PdfUpgradeAnalysisUnavailable` - Response indicating PDF analysis is unavailable
- `export RenderedPdfPage` - Metadata for a single rendered PDF page
- `export PdfExtractionOutput` - item implementation
- `export PdfUpgradeAnalysisKeepBaseline` - item implementation
- `export PdfUpgradeAnalysisResponse` - item implementation

### offscreen/sandbox-bridge.ts
**Purpose**: Bridge for communicating with the sandboxed iframe that runs MediaInfo.js. Coordinates analysis requests and response handling.

**Exports**:
- `export destroySandbox` - item implementation
- `export fetchAndAnalyzeFromUrl` - Fetches media from URL using streaming and analyzes it vi...
- `export ensureSandboxReady` - item implementation

### offscreen/text-analysis-handler.ts
**Purpose**: 1 export

**Exports**:
- `export initializeTextAnalysisHandler` - item implementation

### offscreen/text-analysis/constants.ts
**Purpose**: Text analysis constants for language detection and summarization. These values define thresholds and limits for AI processing.

**Exports**:
- `export LANGUAGE_DETECTION_SAMPLE_SIZE` - Maximum character length for language detection sample
- `export PREVIEW_LOG_LENGTH` - Character limit for summary preview logging
- `export SUMMARIZATION_SAMPLE_SIZE` - Maximum character length for summarization input

### offscreen/text-analysis/filename-builder.ts
**Purpose**: 6 exports

**Exports**:
- `export FilenameContext` - item implementation
- `export buildFilename` - item implementation
- `export buildProposalSummary` - item implementation
- `export buildProposedPath` - item implementation
- `export extractStemFromBaseline` - Extract filename stem (without extension) from baseline f...
- `export formatReasonTags` - item implementation

### offscreen/text-analysis/filename-generation-prompts.ts
**Purpose**: Prompt building logic for filename generation. Constructs structured prompts that guide AI models to generate appropriate filenames. SECURITY: URL sanitization is applied to page context URLs. Other page context fields (title, heading) are already sanitized in buildBaseContextDescription.

**Exports**:
- `export GENERATION_SYSTEM_PROMPT` - System prompt that establishes the AI's role as a filenam...
- `export buildGenerationPrompt` - Build the generation prompt that asks the AI to create a ...

### offscreen/text-analysis/filename-generation-types.ts
**Purpose**: Type definitions for filename generation. Shared types used across generation, validation, and prompt modules.

**Exports**:
- `export FilenameGeneration` - Structured response from the generation prompt
- `export FilenameGenerationContext` - Context information needed to generate a new filename
- `export FILENAME_GENERATION_SCHEMA` - JSON Schema for enforcing structured output from the Prom...

### offscreen/text-analysis/filename-generation-validator.ts
**Purpose**: Validation logic for filename generation responses. Ensures generated filenames meet structural and quality requirements.

**Exports**:
- `export validateGenerationResponse` - Validate that the generation response has required fields...

### offscreen/text-analysis/filename-generation.ts
**Purpose**: Filename generation module using Chrome's Prompt API. This module generates new filename stems based on content analysis. It only runs AFTER the decision module determines that renaming is needed. SECURITY: All untrusted inputs (page context, summary) are sanitized via shared utilities.

**Exports**:
- `export generateFilenameComplete` - Generate full filename object with qualifiers
- `export generateFilenameStem` - Main function to generate a new filename stem using Promp...
- `export isHighConfidenceGeneration` - Helper to determine if a generation has high confidence

### offscreen/text-analysis/language-detection.ts
**Purpose**: 2 exports

**Exports**:
- `export LanguageDetectionResult` - item implementation
- `export detectLanguage` - item implementation

### offscreen/text-analysis/pipeline-orchestrator.ts
**Purpose**: Note: Offscreen contexts cannot persist debug settings, so we route all operational logs through offscreenLogger which is always enabled inside the offscreen document. Higher-severity warnings/errors still use the same logger so we have a single output path.

**Exports**:
- `export runTextUpgradePipeline` - item implementation

### offscreen/text-analysis/prompt-helpers.ts
**Purpose**: Shared utilities for Prompt API integration across decision and generation modules. These helpers provide common functionality for session management, availability checks, and response parsing. SECURITY: All untrusted inputs (filenames, content summaries) are sanitized to prevent prompt injection attacks.

**Exports**:
- `export BasePromptContext` - Build base context information for prompts
- `export buildBaseContextDescription` - item implementation
- `export checkLanguageModelAvailability` - Check if the LanguageModel (Prompt API) is available and ...
- `export createPromptSession` - Create a LanguageModel prompt session with common configu...
- `export destroyPromptSession` - Safely destroy a prompt session, catching any errors
- `export formatLanguageForPrompt` - Format a language code for display in prompts
- `export formatPolicyRules` - Format policy rules as human-readable text for inclusion ...
- `export parseStructuredResponse` - Parse and validate structured JSON response from Prompt API
- `export resolveLanguageModelCtor` - Resolve LanguageModel constructor from Chrome's global scope
- `export truncateForPrompt` - Truncate text for inclusion in prompts while respecting t...

### offscreen/text-analysis/rename-decision-prompts.ts
**Purpose**: Shared prompt text for the rename decision workflow.

**Exports**:
- `export DECISION_SYSTEM_PROMPT` - Shared prompt text for the rename decision workflow

### offscreen/text-analysis/rename-decision-types.ts
**Purpose**: 3 exports

**Exports**:
- `export RenameDecision` - Structured response from the decision prompt
- `export RenameDecisionContext` - Context information needed to make a rename decision
- `export RenameDecisionReason` - Reasons why a filename might need (or not need) renaming

### offscreen/text-analysis/rename-decision-validation.ts
**Purpose**: 1 export

**Exports**:
- `export validateDecisionResponse` - Runtime validation for AI rename decision responses

### offscreen/text-analysis/rename-decision.ts
**Purpose**: Rename decision module using Chrome's Prompt API. This module decides whether a filename needs renaming by analyzing its quality against the file content. It uses a separate JSON schema focused purely on the decision logic, independent of filename generation. SECURITY: All untrusted inputs (filenames) are sanitized to prevent prompt injection.

**Exports**:
- `export decideIfShouldRename` - Main function to decide if a filename should be renamed

### offscreen/text-analysis/telemetry.ts
**Purpose**: 6 exports

**Exports**:
- `export recordDecisionMade` - Record when a rename decision is made by the Prompt API
- `export recordGenerationFailure` - Record when filename generation fails
- `export recordGenerationSuccess` - Record successful filename generation by the Prompt API
- `export recordPipelineBlocked` - item implementation
- `export recordPipelineRouted` - item implementation
- `export recordPromptPipelineComplete` - Record complete prompt pipeline execution metrics

### offscreen/text-analysis/text-summarization.ts
**Purpose**: Note: Offscreen contexts cannot persist debug toggles, so we log via offscreenLogger which is always enabled. This keeps operational telemetry available even when storage APIs are blocked.

**Exports**:
- `export summarizeText` - Generate a summary of text using Chrome's built-in Summar...

### popup/App.tsx
**Purpose**: Settings popup for configuring deterministic Instant Baseline strategies

**Exports**:
- `export default` - item implementation

### popup/components/AiModelBanner.tsx
**Purpose**: 1 export

**Exports**:
- `export default` - item implementation

### popup/components/HistoryTab.tsx
**Purpose**: 1 export

**Exports**:
- `export default` - item implementation

### popup/components/HistoryTab/EmptyStateMessage.tsx
**Purpose**: 1 export

**Exports**:
- `export EmptyStateMessage` - item implementation

### popup/components/HistoryTab/HistoryFilterButton.tsx
**Purpose**: 1 export

**Exports**:
- `export HistoryFilterButton` - item implementation

### popup/components/HistoryTab/HistoryItem.tsx
**Purpose**: 1 export

**Exports**:
- `export HistoryItem` - item implementation

### popup/components/HistoryTab/SummaryDisplay.tsx
**Purpose**: 1 export

**Exports**:
- `export SummaryDisplay` - item implementation

### popup/components/HistoryTab/utils.ts
**Purpose**: 1 export

**Exports**:
- `export getRenameLabel` - Get the rename label based on the source of the rename

### popup/components/IconButton.tsx
**Purpose**: 1 export

**Exports**:
- `export IconButton` - Icon-only button with theme-aware background and tooltip

### popup/components/PrimaryButton.tsx
**Purpose**: 1 export

**Exports**:
- `export PrimaryButton` - Primary action button with dark background used in alerts...

### popup/components/ProcessingModeIndicator.tsx
**Purpose**: 1 export

**Exports**:
- `export ProcessingModeIndicator` - Small indicator showing current AI processing mode with t...

### popup/components/StrategyTab.tsx
**Purpose**: 1 export

**Exports**:
- `export default` - item implementation

### popup/hooks/useAiModelStatus.ts
**Purpose**: 2 exports

**Exports**:
- `export describeAiState` - item implementation
- `export useAiModelStatus` - item implementation

### popup/hooks/useDownloadsAccess.ts
**Purpose**: 1 export

**Exports**:
- `export useDownloadsAccess` - item implementation

### popup/hooks/useHistory.ts
**Purpose**: 2 exports

**Exports**:
- `export HistoryFilter` - item implementation
- `export useHistory` - item implementation

### popup/hooks/useManagedFolderPath.ts
**Purpose**: 1 export

**Exports**:
- `export useManagedFolderPath` - Hook to fetch and cache the managed folder path from Inde...

### popup/hooks/usePopupSettings.ts
**Purpose**: 1 export

**Exports**:
- `export usePopupSettings` - item implementation

### popup/main.tsx
**Purpose**: React popup entry point and application bootstrapping

*No exports found*

### popup/onboarding/DownloadsAccessScreen.tsx
**Purpose**: Compact downloads access onboarding screen for popup

**Exports**:
- `export DownloadsAccessScreenProps` - Compact downloads access onboarding screen for popup
- `export DownloadsAccessScreen` - item implementation

### sandbox/main.ts
**Purpose**: Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.

*No exports found*

### settings/SettingsPage.tsx
**Purpose**: Settings page for cloud AI and processing preferences

**Exports**:
- `export SettingsPage` - item implementation

### settings/components/CloudAiSection.tsx
**Purpose**: Cloud AI configuration section

**Exports**:
- `export CloudAiSection` - item implementation

### settings/components/ProcessingPreferences.tsx
**Purpose**: Per-file-type processing preferences

**Exports**:
- `export ProcessingPreferencesSection` - item implementation

### settings/main.tsx
**Purpose**: Settings page entry point

*No exports found*

### shared/classification/file-types.ts
**Purpose**: File type detection from MIME and extensions

**Exports**:
- `export detectFileType` - item implementation
- `export isImageExtension` - Check if a file extension indicates an image file eligibl...
- `export isPdfExtension` - Check if a file extension indicates a PDF file eligible f...
- `export isTextExtension` - Check if a file extension indicates a text file eligible ...

### shared/classification/sensitive-content.ts
**Purpose**: Sensitive content detection heuristics for confirmation routing.

**Exports**:
- `export SensitiveDetectionInput` - item implementation
- `export SensitiveDetectionMatch` - item implementation
- `export SensitiveDetectionResult` - item implementation
- `export SensitiveReason` - Sensitive content detection heuristics for confirmation r...
- `export detectSensitiveContent` - item implementation

### shared/constants/confidence-thresholds.ts
**Purpose**: Confidence thresholds for AI rename decisions shared across the codebase. The rename pipeline uses a three-tier scale: - `>= 0.8` ⟶ silent rename without showing a confirmation toast. - `>= 0.5` ⟶ confirmation toast with an auto-apply countdown. - `< 0.5`  ⟶ manual confirmation, no automatic actions. Keeping the thresholds and helpers here ensures every surface (toast routing, history entries, tests, etc.) speaks the same language. If we ever make them user-configurable we only need to touch this module.

**Exports**:
- `export AutoApplyBehavior` - item implementation
- `export AutoApplyBehaviorOptions` - item implementation
- `export AutoApplyBehaviorLevel` - item implementation
- `export AUTO_APPLY_THRESHOLD` - Threshold for auto-apply with countdown
- `export MODERATE_CONFIDENCE_SCORE` - Represents a moderate-confidence state (auto-apply disabl...
- `export SILENT_RENAME_THRESHOLD` - Threshold for silent rename (no confirmation toast)
- `export getAutoApplyBehavior` - Normalizes a confidence score into actionable behavior flags
- `export isValidConfidenceScore` - Runtime guard for confidence scores
- `export normalizeConfidenceScore` - Ensures the provided score lives inside the [0, 1] range ...

### shared/constants/file-constants.ts
**Purpose**: Shared file-related constants used across the application

**Exports**:
- `export MultiPartArchiveExtension` - item implementation
- `export OriginalDelimiterCandidate` - item implementation
- `export EXTENSION_MAP` - item implementation
- `export FORBIDDEN_FILENAME_CHARS` - item implementation
- `export MIME_PREFIX_MAP` - item implementation
- `export MIME_TYPE_MAP` - item implementation
- `export MULTI_PART_ARCHIVE_EXTENSIONS` - Shared file-related constants used across the application
- `export ORIGINAL_DELIMITER_CANDIDATES` - item implementation
- `export TEXT_EXTENSIONS` - item implementation

### shared/context/context-updater.ts
**Purpose**: Context update logic for content script Handles queuing, retrying, and dispatching page context updates

**Exports**:
- `export ContextUpdater` - item implementation
- `export ContextUpdate` - item implementation
- `export createContextUpdater` - item implementation
- `export firstHeading` - item implementation
- `export truncate` - item implementation

### shared/context/page-analyzer.ts
**Purpose**: 6 exports

**Exports**:
- `export InstantBaselineSignals` - item implementation
- `export PageContextSnapshot` - Page context extraction and URL analysis utilities
- `export deriveDomainBrand` - item implementation
- `export extractResolutionFromFilename` - item implementation
- `export safeDecode` - item implementation
- `export extractFileName` - item implementation

### shared/context/page-context-formatter.ts
**Purpose**: Page context formatting utilities for AI prompts Provides consistent formatting of page context (title, heading, URL) across all AI providers SECURITY: All inputs are sanitized to prevent prompt injection attacks. Page context values (title, heading, URL) come from untrusted web pages.

**Exports**:
- `export formatPageContextForPrompt` - Format page context as a prompt snippet for AI models
Inc...
- `export formatPageContextInline` - Format page context for inline display (single line with ...
- `export formatPageContextMultiline` - Format page context for multiline display (each part on s...

### shared/debug/console-helpers.ts
**Purpose**: Console helper functions for debugging

**Exports**:
- `export attachConsoleHelpers` - Global debug helpers attached to window for easy console ...
- `export initializeBackgroundDebug` - Initialize debug helpers in background script

### shared/debug/logger.ts
**Purpose**: Debug logging utilities for troubleshooting rename decisions

**Exports**:
- `export debugLogger` - item implementation

### shared/debug/offscreen-logger.ts
**Purpose**: Offscreen Logger - Debugging utility for offscreen documents Provides logging for offscreen contexts where storage access is unavailable. Works independently without relying on chrome.storage or WXT storage APIs. Always enabled to ensure offscreen operations are visible during debugging. Usage in offscreen documents: - `offscreenLogger.log(message, data)` - Standard logging - `offscreenLogger.warn(message, data)` - Warning messages - `offscreenLogger.error(message, data)` - Error messages

**Exports**:
- `export offscreenLogger` - Export logs as JSON for troubleshooting

### shared/debug/types.ts
**Purpose**: Debug types and interfaces for troubleshooting rename decisions

**Exports**:
- `export DebugContext` - item implementation
- `export DebugEvent` - item implementation
- `export DebugPolicyResult` - item implementation
- `export InstantBaselineStrategyDebugSnapshot` - item implementation
- `export DebugLevel` - Debug types and interfaces for troubleshooting rename dec...

### shared/debug/verbose-formatter.ts
**Purpose**: Verbose debug formatting utilities

**Exports**:
- `export logVerboseContext` - Verbose debug formatting utilities

### shared/filesystem/directory-picker.ts
**Purpose**: Directory picker and permission management for the File System Access API.

**Exports**:
- `export ManagedSubfolderRequiredError` - Request read/write access to the Downloads directory
- `export DirectoryHandleWithPermission` - Directory picker and permission management for the File S...
- `export DownloadsAccessResult` - item implementation
- `export isHandleValid` - Determine whether the provided handle is still valid and ...
- `export requestDownloadsAccess` - item implementation
- `export verifyDirectoryPermission` - Verify (and if necessary request) read/write permission f...

### shared/filesystem/file-reader.ts
**Purpose**: Utilities for reading files from the File System Access API.

**Exports**:
- `export ReadFileSliceError` - item implementation
- `export ReadFileSliceResult` - item implementation
- `export ResolveFileHandleError` - item implementation
- `export ResolveFileHandleResult` - Utilities for reading files from the File System Access API.
- `export ReadFileSliceOutput` - item implementation
- `export ResolveFileHandleOutput` - item implementation
- `export readFileSlice` - Read a slice of a file up to maxBytes
- `export resolveFileHandle` - Resolve a file handle from a root directory and relative ...

### shared/filesystem/handle-storage.ts
**Purpose**: Persist and retrieve File System Access handles using IndexedDB. File system handles are structured-clone serialisable and must live in IndexedDB (not chrome.storage.local) so that they can be restored in offscreen documents and service workers.

**Exports**:
- `export StoredHandleInfo` - item implementation
- `export clearStoredHandle` - item implementation
- `export getHandleMetadata` - item implementation
- `export getManagedRelativePath` - item implementation
- `export getStoredDirectoryHandle` - item implementation
- `export normalizeRelativePath` - item implementation
- `export storeDirectoryHandle` - item implementation
- `export updateLastVerified` - item implementation

### shared/filesystem/path-helpers.ts
**Purpose**: Utilities for normalising download paths and managed subfolder prefixes.

**Exports**:
- `export buildManagedPath` - item implementation
- `export normalizeDownloadPath` - Utilities for normalising download paths and managed subf...
- `export normalizeManagedPrefix` - item implementation

### shared/filesystem/rename-operations.ts
**Purpose**: Core file rename operations built on top of the File System Access API. Implements the copy+delete fallback until FileSystemHandle.move() ships for non-OPFS files. Supports nested paths, streaming for large files, and Windows reserved-name sanitisation.

**Exports**:
- `export RenameOptions` - item implementation
- `export RenameResult` - item implementation
- `export renameFile` - Rename a file located inside the granted directory handle
- `export renameFileNative` - item implementation
- `export supportsNativeMove` - item implementation

### shared/filesystem/types.ts
**Purpose**: Shared types for File System Access operations and state.

**Exports**:
- `export FileSystemState` - Shared types for File System Access operations and state
- `export RenameRequest` - item implementation
- `export RenameResponse` - item implementation

### shared/history/history.ts
**Purpose**: File renaming action history tracking and storage orchestration. Keeps the public API focused while storage and validation live in dedicated modules.

**Exports**:
- `export addHistoryItem` - item implementation
- `export getHistory` - item implementation
- `export getHistoryItem` - item implementation
- `export updateHistoryItem` - item implementation

### shared/history/storage.ts
**Purpose**: History storage operations with pruning and sanitization

**Exports**:
- `export HISTORY_STORAGE_KEY` - item implementation
- `export readHistory` - item implementation
- `export writeHistory` - item implementation

### shared/history/types.ts
**Purpose**: Type definitions for history items and metadata

**Exports**:
- `export HistoryImageAnalysis` - item implementation
- `export HistoryItem` - item implementation
- `export HistoryMediaMetadata` - item implementation
- `export PendingUpgradeAnalysis` - item implementation
- `export UpgradeProposal` - item implementation
- `export UpgradeProposalSource` - Type definitions for history items and metadata
- `export MAX_PENDING_ANALYSIS_AGE_MS` - item implementation

### shared/history/validation.ts
**Purpose**: Runtime validation for history data integrity

**Exports**:
- `export isHistoryMediaMetadata` - item implementation
- `export isPendingUpgradeAnalysis` - item implementation
- `export isUpgradeProposal` - item implementation
- `export isValidHistoryItem` - item implementation

### shared/integrations/ai-provider/ai-router.ts
**Purpose**: Smart AI Router Routes analysis requests to the appropriate provider (local or cloud) based on user preferences, provider availability, and fallback logic.

**Exports**:
- `export AiRouter` - AI Router for selecting and coordinating between local an...

### shared/integrations/ai-provider/cloud-adapter.ts
**Purpose**: Cloud AI Adapter Integrates with cloud AI services (Google Gemini) via ai-sdk. Provides fallback/alternative to local Chrome AI processing. This adapter delegates to specialized analysis pipelines: - Text: cloud-text-analysis.ts - Image: cloud-image-analysis.ts - PDF: cloud-pdf-analysis.ts

**Exports**:
- `export CloudAiAdapter` - Cloud AI provider using Google Gemini via ai-sdk

Sends p...

### shared/integrations/ai-provider/cloud-image-analysis.ts
**Purpose**: Cloud Image Analysis Pipeline Handles image analysis using Google Gemini via ai-sdk. Implements three-phase analysis: description → decision → generation SECURITY: All untrusted inputs (filename, AI-generated description) are sanitized.

**Exports**:
- `export analyzeImageWithGemini` - Analyze image using Google Gemini

### shared/integrations/ai-provider/cloud-pdf-analysis.ts
**Purpose**: Cloud PDF Analysis Pipeline Handles PDF analysis using Google Gemini via ai-sdk. Implements three-phase analysis: title extraction → decision → generation SECURITY: All untrusted inputs (filename, extracted titles) are sanitized. Note: mergePdfContext already sanitizes extracted titles and descriptions.

**Exports**:
- `export analyzePdfWithGemini` - Analyze PDF using Google Gemini

Implements 3-phase pipel...

### shared/integrations/ai-provider/cloud-text-analysis.ts
**Purpose**: Cloud Text Analysis Pipeline Handles text analysis using Google Gemini via ai-sdk. Implements two-phase analysis: decision → generation SECURITY: All untrusted inputs (filename, content, page context) are sanitized.

**Exports**:
- `export analyzeTextWithGemini` - Analyze text using Google Gemini

### shared/integrations/ai-provider/helpers.ts
**Purpose**: Shared helpers for AI provider integrations

**Exports**:
- `export DATE_FORMAT_RULE` - Date format instruction for AI filename generation
Consis...
- `export parseJsonResponse` - Smart JSON parser that handles both markdown-wrapped and ...

### shared/integrations/ai-provider/local-adapter.ts
**Purpose**: Local AI Adapter Wraps Chrome's built-in AI (Gemini Nano) for on-device processing. This adapter delegates to existing pipeline orchestrators without changing their logic.

**Exports**:
- `export LocalAiAdapter` - Local AI provider using Chrome's built-in AI (Gemini Nano...

### shared/integrations/ai-provider/summary-builder.ts
**Purpose**: AI Analysis Summary Builder Provides utilities for building comprehensive summaries from AI analysis results. These summaries combine multiple pieces of information (description, decision reasoning) into user-friendly explanations.

**Exports**:
- `export buildCloudImageAnalysisSummary` - Build comprehensive summary for cloud image analysis
Comb...
- `export buildCloudTextAnalysisSummary` - Build comprehensive summary for cloud text analysis
Combi...

### shared/integrations/ai-provider/types.ts
**Purpose**: AI Provider Abstraction Layer This module defines a unified interface for AI providers (local Chrome AI vs. cloud services). Allows seamless switching between on-device and cloud-based processing.

**Exports**:
- `export AiAnalysisResult` - Analysis result with provider metadata
- `export AiRouterConfig` - Router configuration for AI provider selection
- `export BaseKeepBaselineResult` - Shared shape for keep-baseline responses across all upgra...
- `export CloudProviderConfig` - Configuration for cloud AI provider
- `export IAiProvider` - Unified AI provider interface

Each provider (local or cl...
- `export KeepBaselineAnalysisResult` - Result returned when AI decision pipelines intentionally ...
- `export ProcessingPreferences` - Processing preferences per file type
- `export ProviderMetadata` - Metadata about the provider used for a specific analysis
- `export AiProviderType` - Provider type identifier
- `export ProcessingMode` - Processing mode preference (per file type)

### shared/integrations/chrome-ai/adapter.ts
**Purpose**: 9 exports

**Exports**:
- `export BuiltInAiAdapter` - item implementation
- `export LanguageDetectorResult` - item implementation
- `export PromptRequest` - item implementation
- `export PromptResult` - item implementation
- `export SummarizerRequest` - Shared adapter interface for Chrome built-in AI APIs
- `export SummarizerResult` - item implementation
- `export createMockBuiltInAiAdapter` - Provide a deterministic mock so we can wire the rest of t...
- `export getBuiltInAiAdapter` - Retrieve the globally configured built-in AI adapter
- `export setBuiltInAiAdapter` - Replace the shared adapter

### shared/integrations/chrome-ai/diagnostics-rules/chrome-version-rule.ts
**Purpose**: 2 exports

**Exports**:
- `export ChromeVersionContext` - item implementation
- `export checkChromeVersion` - item implementation

### shared/integrations/chrome-ai/diagnostics-rules/flags-enabled-rule.ts
**Purpose**: 2 exports

**Exports**:
- `export FlagsContext` - item implementation
- `export checkFlagsEnabled` - item implementation

### shared/integrations/chrome-ai/diagnostics-rules/hardware-requirements-rule.ts
**Purpose**: 2 exports

**Exports**:
- `export HardwareRequirementsContext` - item implementation
- `export checkHardwareRequirements` - item implementation

### shared/integrations/chrome-ai/diagnostics-rules/optimization-guide-rule.ts
**Purpose**: 2 exports

**Exports**:
- `export OptimizationGuideContext` - item implementation
- `export checkOptimizationGuide` - item implementation

### shared/integrations/chrome-ai/diagnostics-rules/os-support-rule.ts
**Purpose**: 2 exports

**Exports**:
- `export OsSupportContext` - item implementation
- `export checkOsSupport` - item implementation

### shared/integrations/chrome-ai/diagnostics-rules/wxt-dev-mode-rule.ts
**Purpose**: 2 exports

**Exports**:
- `export WxtDevModeContext` - item implementation
- `export checkWxtDevMode` - item implementation

### shared/integrations/chrome-ai/diagnostics.ts
**Purpose**: Diagnostic utilities for Chrome built-in AI troubleshooting. Identifies specific failure modes and provides targeted fix instructions.

**Exports**:
- `export DiagnosticResult` - item implementation
- `export SystemDiagnostics` - item implementation
- `export DiagnosticIssue` - Diagnostic utilities for Chrome built-in AI troubleshooting.
- `export detectFreshOrDevProfile` - Detect if running in WXT development mode or a fresh Chro...
- `export getChromeVersion` - Get Chrome version information
- `export getDiagnosticSummary` - Get a summary message based on diagnostic results
- `export getPlatform` - Get platform information
- `export runDiagnostics` - Run comprehensive diagnostics and return specific issues

### shared/integrations/chrome-ai/ensure-local-ai-setup.ts
**Purpose**: Utilities for checking and ensuring local AI setup is complete. Used across Settings and Downloads Permission screens to guide users through AI setup.

**Exports**:
- `export ensureLocalAiSetup` - Checks if local AI setup is needed and opens the setup pa...
- `export isLocalAiSetupNeeded` - Checks if local AI setup is needed
- `export openAiModelSetupPage` - Opens the AI model setup page in a new tab

### shared/integrations/chrome-ai/language-helpers.ts
**Purpose**: Shared helpers for normalising and resolving language preferences when interacting with Chrome's built-in AI surfaces.

**Exports**:
- `export detectBrowserLanguage` - item implementation
- `export getUserLanguagePreference` - item implementation
- `export normalizeLanguageCode` - item implementation
- `export resolveSupportedLanguage` - item implementation

### shared/integrations/chrome-ai/model-status-service.ts
**Purpose**: Proxy service for AI model status management. Ensures model availability checks and downloads run in the background context where storage access is guaranteed.

**Exports**:
- `export getAiModelStatusService` - item implementation
- `export registerAiModelStatusService` - item implementation

### shared/integrations/chrome-ai/model-status.ts
**Purpose**: 12 exports

**Exports**:
- `export AiModelId` - item implementation
- `export AiModelProgressEvent` - item implementation
- `export AiModelState` - item implementation
- `export AiModelStatus` - item implementation
- `export AiModelStatusMap` - item implementation
- `export EnsureAiModelsOptions` - item implementation
- `export RefreshAiModelOptions` - item implementation
- `export AI_MODEL_IDS` - item implementation
- `export ensureAiModelsReady` - item implementation
- `export getCachedAiModelStatuses` - item implementation
- `export refreshAiModelStatuses` - item implementation
- `export subscribeAiModelStatuses` - item implementation

### shared/integrations/chrome-ai/model-status/status-cache.ts
**Purpose**: 5 exports

**Exports**:
- `export ensureCacheLoaded` - item implementation
- `export notifyListeners` - item implementation
- `export persistStatusForId` - item implementation
- `export persistStatusMap` - item implementation
- `export subscribeStatusUpdates` - item implementation

### shared/integrations/chrome-ai/model-status/status-preparation.ts
**Purpose**: 2 exports

**Exports**:
- `export createPreparationKey` - item implementation
- `export ensureModelsReady` - item implementation

### shared/integrations/chrome-ai/model-status/status-probe.ts
**Purpose**: 2 exports

**Exports**:
- `export probeModel` - item implementation
- `export refreshAiModelStatus` - item implementation

### shared/integrations/chrome-ai/model-status/status-types.ts
**Purpose**: 9 exports

**Exports**:
- `export AiModelStatus` - item implementation
- `export EnsureAiModelsOptions` - item implementation
- `export PreparationCacheKey` - item implementation
- `export RefreshAiModelOptions` - item implementation
- `export AiModelId` - item implementation
- `export AiModelProgressEvent` - item implementation
- `export AiModelState` - item implementation
- `export AiModelStatusMap` - item implementation
- `export AI_MODEL_IDS` - item implementation

### shared/integrations/chrome-ai/model-status/status-utils.ts
**Purpose**: 21 exports

**Exports**:
- `export buildStatus` - item implementation
- `export cloneStatusMap` - item implementation
- `export createDefaultStatus` - item implementation
- `export createTextDescriptor` - item implementation
- `export deriveErrorCode` - item implementation
- `export deriveErrorMessage` - item implementation
- `export ensureStatusShape` - item implementation
- `export ensureUserActivation` - item implementation
- `export isAbortError` - item implementation
- `export normaliseAvailability` - item implementation
- `export resolveExpectedInputs` - item implementation
- `export resolveExpectedOutputs` - item implementation
- `export resolveLanguageDetectorCtor` - item implementation
- `export resolveLanguageModelCtor` - item implementation
- `export resolveOutputLanguage` - item implementation
- `export resolveSummarizerCtor` - item implementation
- `export resolveSummarizerInputLanguages` - item implementation
- `export safeEmit` - item implementation
- `export serializeIoDescriptor` - item implementation
- `export throwIfAborted` - item implementation
- `export wrapMonitor` - item implementation

### shared/integrations/chrome-ai/setup-state.ts
**Purpose**: 8 exports

**Exports**:
- `export AiModelSetupError` - item implementation
- `export AiModelSetupState` - item implementation
- `export clearAiModelSetupError` - item implementation
- `export getAiModelSetupState` - item implementation
- `export markAiModelSetupCompleted` - item implementation
- `export recordAiModelSetupError` - item implementation
- `export resetAiModelSetupStateForTesting` - item implementation
- `export subscribeAiModelSetupState` - item implementation

### shared/integrations/chrome-ai/telemetry.ts
**Purpose**: 9 exports

**Exports**:
- `export AiModelTelemetryState` - item implementation
- `export getAiModelTelemetrySnapshot` - item implementation
- `export recordAiModelDownloadComplete` - item implementation
- `export recordAiModelDownloadStart` - item implementation
- `export recordAiModelError` - item implementation
- `export recordAiModelStatusTransition` - item implementation
- `export recordAiPipelineBlocked` - item implementation
- `export recordAiPipelineRouted` - item implementation
- `export resetAiModelTelemetry` - item implementation

### shared/integrations/chrome-ai/test-mocks.ts
**Purpose**: Test utilities for mocking Chrome AI model status functions. Provides reusable mocks for ensureAiModelsReady with happy path and error scenarios.

**Exports**:
- `export createMockModelStatusMap` - Create a mock AiModelStatusMap for testing
- `export mockEnsureAiModelsReadyAborted` - Setup mock for ensureAiModelsReady with AbortError
- `export mockEnsureAiModelsReadyDownloading` - Setup error mock for ensureAiModelsReady
- `export mockEnsureAiModelsReadyError` - Setup error mock for ensureAiModelsReady
- `export mockEnsureAiModelsReadyNotAllowed` - Setup mock for ensureAiModelsReady with NotAllowedError
- `export mockEnsureAiModelsReadyPartial` - Setup partial mock for ensureAiModelsReady
- `export mockEnsureAiModelsReadySuccess` - Setup happy path mock for ensureAiModelsReady
- `export mockEnsureAiModelsReadyUnavailable` - Setup error mock for ensureAiModelsReady

### shared/integrations/chrome-ai/types.ts
**Purpose**: 27 exports

**Exports**:
- `export ChromeLanguageModelAvailabilityOptions` - item implementation
- `export ChromeLanguageModelCapabilities` - item implementation
- `export ChromeLanguageModelConstructor` - item implementation
- `export ChromeLanguageModelContentItem` - Represents a multimodal content item that can contain tex...
- `export ChromeLanguageModelCreateOptions` - item implementation
- `export ChromeLanguageModelIODescriptor` - item implementation
- `export ChromeLanguageModelPromptMessage` - Prompt message that supports both text-only and multimoda...
- `export ChromeLanguageModelPromptOptions` - item implementation
- `export ChromeLanguageModelSession` - item implementation
- `export ChromeAIMonitor` - item implementation
- `export ChromeAIMonitorEvent` - item implementation
- `export ChromeLanguageDetection` - item implementation
- `export ChromeLanguageDetectorConstructor` - item implementation
- `export ChromeLanguageDetectorInstance` - item implementation
- `export ChromeLanguageDetectorOptions` - item implementation
- `export ChromeLanguageModelAvailability` - item implementation
- `export ChromeLanguageModelIOType` - item implementation
- `export ChromeLanguageModelMessageRole` - item implementation
- `export ChromeSummarizerAvailabilityOptions` - item implementation
- `export ChromeSummarizerConstructor` - item implementation
- `export ChromeSummarizerFormat` - item implementation
- `export ChromeSummarizerInstance` - item implementation
- `export ChromeSummarizerLength` - item implementation
- `export ChromeSummarizerOptions` - item implementation
- `export ChromeSummarizerResult` - item implementation
- `export ChromeSummarizerType` - item implementation
- `export CHROME_LANGUAGE_MODEL_AVAILABILITY_VALUES` - item implementation

### shared/integrations/image-analysis/constants.ts
**Purpose**: Centralized constants for image analysis integration and pipeline

**Exports**:
- `export IMAGE_ANALYSIS_FORMAT` - Target MIME type for all image analysis (PNG for safety a...
- `export MAX_DESCRIPTION_LENGTH_CHARS` - Maximum description length before warning
- `export MAX_IMAGE_EDGE_PX` - Maximum longest edge dimension in pixels for downscaled i...
- `export MAX_IMAGE_FILE_SIZE_BYTES` - Maximum file size to attempt loading as image (before dow...
- `export MIN_DOWNSCALE_RATIO` - Minimum downscale ratio to prevent excessive image degrad...
- `export MIN_IMAGE_DIMENSION_PX` - Minimum dimensions to consider valid image
- `export MULTIMODAL_SETUP_INSTRUCTIONS` - User-friendly instructions for enabling multimodal AI sup...
- `export buildSessionCreationFailureMessage` - Error message when session creation fails despite availab...

### shared/integrations/image-analysis/types.ts
**Purpose**: Type definitions for image analysis upgrade pipeline

**Exports**:
- `export ImageIngestionResult` - item implementation
- `export ImageUpgradeAnalysisError` - item implementation
- `export ImageUpgradeAnalysisKeepBaseline` - Shared shape for keep-baseline responses across all upgra...
- `export ImageUpgradeAnalysisRequest` - Optional PDF context passed through image analysis pipeline
- `export ImageUpgradeAnalysisSkipped` - item implementation
- `export ImageUpgradeAnalysisSuccess` - Optional PDF context for prioritizing document titles in ...
- `export ImageUpgradeAnalysisUnavailable` - item implementation
- `export PdfContextForImage` - Optional PDF context passed through image analysis pipeli...
- `export ImageAnalysisMode` - item implementation
- `export ImageUpgradeAnalysisResponse` - item implementation
- `export ImageUpgradeModelSource` - item implementation

### shared/integrations/mediainfo/constants.ts
**Purpose**: Centralized constants for MediaInfo integration and analysis pipeline.

**Exports**:
- `export ANALYSIS_TIMEOUT_MS` - Maximum time to wait for media analysis to complete in th...
- `export MAX_FULL_DOWNLOAD_SIZE` - Maximum size in bytes for full file downloads when range ...
- `export MEDIA_ANALYSIS_MAX_WAIT_MS` - Maximum time to wait for media analysis before suggesting...
- `export OFFSCREEN_DYNAMIC_IMPORT_MAX_RETRIES` - Maximum number of retry attempts for dynamic imports in o...
- `export OFFSCREEN_DYNAMIC_IMPORT_RETRY_DELAYS` - Retry delays in milliseconds for dynamic import attempts ...
- `export OFFSCREEN_HANDSHAKE_BACKOFF_MS` - Base backoff delay in milliseconds for offscreen handshak...
- `export OFFSCREEN_HANDSHAKE_MAX_RETRIES` - Maximum number of retry attempts for offscreen document h...
- `export OFFSCREEN_INIT_DELAY_MS` - Delay in milliseconds after DOMContentLoaded before annou...
- `export SANDBOX_READY_TIMEOUT_MS` - Maximum time to wait for sandbox iframe to send ready signal
- `export SUGGEST_TIMEOUT_MS` - Total timeout for filename suggestion in download interce...

### shared/integrations/mediainfo/debug.ts
**Purpose**: Debug logging utilities for media analysis pipeline

**Exports**:
- `export MediaDebugSettings` - Debug logging utilities for media analysis pipeline
- `export logMediaDebug` - item implementation

### shared/integrations/mediainfo/index.ts
**Purpose**: Main entry point for MediaInfo integration and media file analysis

**Exports**:
- `export MediaAnalysisError` - item implementation
- `export AnalyzeMediaFromBlobResult` - item implementation
- `export AnalyzeMediaFromUrlOptions` - item implementation
- `export AnalyzeMediaFromUrlResult` - item implementation
- `export analyzeMediaFromBlob` - item implementation
- `export analyzeMediaFromUrl` - item implementation
- `export MEDIAINFO_CHUNK_SIZE` - item implementation

### shared/integrations/mediainfo/media-analysis-queue.ts
**Purpose**: Queue manager for sequential media analysis requests

**Exports**:
- `export enqueueMediaAnalysis` - item implementation
- `export resetMediaAnalysisQueueForTesting` - item implementation

### shared/integrations/mediainfo/media-summary.ts
**Purpose**: MediaInfo result summarization and metadata extraction

**Exports**:
- `export MediaMetadataSummary` - item implementation
- `export summariseMediaInfo` - item implementation
- `export AudioTrackSummary` - item implementation
- `export VideoTrackSummary` - item implementation

### shared/integrations/mediainfo/mediainfo-loader.ts
**Purpose**: MediaInfo.js WASM loader and instance management

**Exports**:
- `export MediaInfoInstance` - MediaInfo.js WASM loader and instance management
- `export MEDIAINFO_CHUNK_SIZE` - MediaInfo.js WASM loader and instance management
- `export getMediaInfoInstance` - item implementation
- `export resetMediaInfoInstanceForTesting` - item implementation

### shared/integrations/mediainfo/messages.ts
**Purpose**: Type definitions for media analysis request/response protocol

**Exports**:
- `export MediaAnalysisFailure` - item implementation
- `export MediaAnalysisRequest` - Type definitions for media analysis request/response prot...
- `export MediaAnalysisSuccess` - item implementation
- `export MediaAnalysisResponse` - item implementation

### shared/integrations/mediainfo/offscreen-coordinator.ts
**Purpose**: Offscreen document lifecycle and readiness coordination

**Exports**:
- `export ensureOffscreenReady` - Ensure the offscreen document is ready with MediaInfo ini...
- `export resetOffscreenCoordinatorForTesting` - Reset coordinator state for testing

### shared/integrations/mediainfo/parsers/duration-parser.ts
**Purpose**: Duration parsing utilities for MediaInfo track data

**Exports**:
- `export parseDurationMs` - Parse duration in milliseconds from a GeneralTrack

### shared/integrations/mediainfo/parsers/track-parser.ts
**Purpose**: Track parsing utilities for MediaInfo video and audio tracks

**Exports**:
- `export AudioTrackSummary` - item implementation
- `export VideoTrackSummary` - Convert bits per second to kilobits per second.
- `export summariseAudioTrack` - Summarize an audio track from MediaInfo data
- `export summariseVideoTrack` - Summarize a video track from MediaInfo data

### shared/integrations/mupdf/mupdf-loader.ts
**Purpose**: MuPDF WASM loader and instance management Configures MuPDF's WASM loading with proper fallbacks for dev/prod MuPDF auto-initializes on import, so we configure globalThis before importing

**Exports**:
- `export MuPdfModule` - MuPDF WASM loader and instance management
- `export getMuPdfModule` - Get the MuPDF module with proper WASM loading configured
...
- `export resetMuPdfModuleForTesting` - item implementation

### shared/integrations/range-fetcher.ts
**Purpose**: Generic HTTP range fetch utilities shared across integrations. Designed to support resumable, partial reads without forcing the caller to download full files when the remote server advertises byte range support.

**Exports**:
- `export RangeFetchReader` - item implementation
- `export RangeFetchOptions` - Generic HTTP range fetch utilities shared across integrat...
- `export RangeFetchResult` - item implementation

### shared/integrations/text-analysis/normalize.ts
**Purpose**: 3 exports

**Exports**:
- `export NormalizeTextBufferOptions` - item implementation
- `export NormalizeTextBufferResult` - Whether to remove leading Markdown fences and HTML tags.
- `export normalizeTextBuffer` - item implementation

### shared/integrations/text-analysis/types.ts
**Purpose**: 13 exports

**Exports**:
- `export CloudConsentRequestDetails` - item implementation
- `export TextUpgradeAnalysisError` - item implementation
- `export TextUpgradeAnalysisKeepBaseline` - Shared shape for keep-baseline responses across all upgra...
- `export TextUpgradeAnalysisPermission` - item implementation
- `export TextUpgradeAnalysisRequest` - item implementation
- `export TextUpgradeAnalysisSkipped` - item implementation
- `export TextUpgradeAnalysisSuccess` - item implementation
- `export TextUpgradeAnalysisUnavailable` - item implementation
- `export TextUpgradeIngestionResult` - item implementation
- `export CloudConsentDecision` - item implementation
- `export TextAnalysisMode` - item implementation
- `export TextUpgradeAnalysisResponse` - item implementation
- `export TextUpgradeModelSource` - item implementation

### shared/lifecycle/install-tracking.ts
**Purpose**: Extension installation date tracking and storage utilities

**Exports**:
- `export ensureInstallDate` - Gets or creates extension installation date
- `export getInstallDate` - Retrieves stored extension installation date
- `export registerInstallDateListener` - Registers browser extension install event listener
- `export setInstallDate` - Stores extension installation date to browser storage

### shared/messaging/core-messages.ts
**Purpose**: Core infrastructure messages Handles runtime context, offscreen lifecycle, and UI toast notifications

**Exports**:
- `export CoreProtocol` - Core infrastructure protocol
- `export offscreenHandshake` - Show a non-blocking rename-complete toast in the active tab.
- `export requestPendingConfirmToasts` - item implementation
- `export sendConfirmToastCountdownControl` - item implementation
- `export sendConfirmToastDecision` - item implementation
- `export sendConfirmToastStatus` - item implementation
- `export sendConfirmToastTimingUpdate` - item implementation
- `export sendShowConfirmToast` - item implementation
- `export sendShowRenameToast` - item implementation
- `export signalOffscreenReady` - item implementation

### shared/messaging/extension-messaging.ts
**Purpose**: Central extension messaging protocol using @webext-core/messaging This file defines the combined messaging protocol interface only. For message helpers and implementations, import directly from domain-specific files: - core-messages.ts: Runtime context, offscreen lifecycle, toast notifications - media-messages.ts: Image and PDF analysis - text-messages.ts: Text analysis, AI pipeline, cloud consent

**Exports**:
- `export ExtensionMessagingProtocol` - Combined extension messaging protocol from all domains
- `export onExtensionMessage` - item implementation
- `export sendExtensionMessage` - item implementation

### shared/messaging/media-messages.ts
**Purpose**: Media analysis messages (image and PDF) Handles image ingestion, PDF analysis, and media metadata extraction

**Exports**:
- `export MediaAnalysisProtocol` - Media analysis protocol - image and PDF analysis
- `export requestImageIngestion` - item implementation
- `export requestMediaAnalysis` - Request PDF analysis (page extraction and image-based ana...
- `export requestPdfAnalysis` - item implementation

### shared/messaging/text-messages.ts
**Purpose**: Text analysis and AI pipeline messages Handles text ingestion, AI model management, telemetry, and cloud consent

**Exports**:
- `export TextAnalysisProtocol` - Text analysis and AI pipeline protocol
- `export AiPipelineTelemetryPayload` - Payload for ensuring AI models are ready with optional mo...
- `export EnsureAiModelsRequestPayload` - Payload for ensuring AI models are ready with optional mo...
- `export ensureAiModelsReadyRemote` - item implementation
- `export recordAiPipelineTelemetryRemote` - item implementation
- `export requestCloudConsentDetails` - item implementation
- `export requestTextIngestion` - Record AI pipeline telemetry events in the background con...
- `export submitCloudConsentDecision` - item implementation

### shared/naming/media-qualifiers-constants.ts
**Purpose**: Constants for media metadata qualifiers Enumerates standard resolutions, audio channels, and codec formats

**Exports**:
- `export AudioChannels` - Audio channel configurations
Standard mappings for differ...
- `export AudioCodec` - Audio codec identifiers
- `export VideoCodec` - Video codec identifiers
- `export VideoResolution` - Common video resolutions with their dimensions
Used for n...
- `export AudioChannelMapping` - item implementation
- `export CodecPattern` - Codec string patterns for matching codec names
- `export VideoResolutionDimensions` - item implementation
- `export AUDIO_CODEC_PATTERNS` - item implementation
- `export CHANNEL_MAPPINGS` - Mapping of channel counts to standard audio format labels
- `export COMMON_RESOLUTIONS` - Mapping of common video resolutions to their dimensions
- `export SKIP_CODECS` - Codecs to skip/ignore during formatting
- `export VIDEO_CODEC_PATTERNS` - Mapping of codec string patterns to codec enums

### shared/naming/media-qualifiers.ts
**Purpose**: Extract media metadata qualifiers for filename enhancement

**Exports**:
- `export MediaQualifiers` - item implementation
- `export extractMediaQualifiers` - item implementation

### shared/naming/policy-engine.ts
**Purpose**: Filename generation policies and formatting rules

**Exports**:
- `export FilenamePolicyInput` - item implementation
- `export FilenamePolicyResult` - item implementation
- `export applyFilenamePolicy` - item implementation
- `export generateMediaEnhancedFilename` - Generate enhanced filename with media metadata qualifiers

### shared/onboarding/onboarding-state.ts
**Purpose**: Persistence helpers for onboarding progress shared across extension contexts.

**Exports**:
- `export OnboardingState` - item implementation
- `export OnboardingStatus` - Two-step onboarding flow for Downloads access:
1
- `export getOnboardingState` - item implementation
- `export markOnboardingAwaitingPersistent` - item implementation
- `export markOnboardingCompleted` - item implementation
- `export markOnboardingSkipped` - item implementation
- `export resetOnboardingState` - item implementation

### shared/parsing/summary-parser.ts
**Purpose**: Summary parser for AI-generated contextual upgrade summaries. Handles structured and unstructured text formats from AI models.

**Exports**:
- `export SummarySegment` - Represents a parsed segment from a summary string
- `export parseSummary` - Parse a summary string into structured segments with opti...

### shared/pipeline/datetime-prefix.ts
**Purpose**: Datetime prefix utilities for AI Rename + date strategy Handles extraction and application of datetime prefixes in format: YYYY-MM-DD_HH-MM Examples: - "2025-11-18_14-30-report.pdf" - "2025-11-18_14-30_report.pdf" - "2025-11-18_14-30 report.pdf"

**Exports**:
- `export applyDateTimePrefix` - Apply datetime prefix to a filename with the specified se...
- `export extractDateTimePrefix` - Extract datetime prefix from a filename if present
- `export hasDateTimePrefix` - Check if a filename has a datetime prefix
- `export removeDateTimePrefix` - Remove datetime prefix from a filename if present

### shared/pipeline/filename-composer.ts
**Purpose**: Filename composition and building utilities for Instant Baseline processing

**Exports**:
- `export buildOriginalWithDateRename` - Build rename proposal with datetime prefix

Format: YYYY-...
- `export buildRenameProposal` - item implementation

### shared/pipeline/instant-baseline-strategy.ts
**Purpose**: Instant Baseline deterministic strategy evaluator

**Exports**:
- `export InstantBaselineComputation` - item implementation
- `export evaluateInstantBaseline` - item implementation
- `export evaluateInstantBaselineDebug` - item implementation
- `export parseIsoDateTime` - Parse ISO timestamp to datetime prefix format using local...

### shared/pipeline/instant-baseline-types.ts
**Purpose**: Shared Instant Baseline decision types

**Exports**:
- `export InstantBaselineDecision` - item implementation
- `export InstantBaselineDecisionSignals` - item implementation
- `export InstantBaselineEvaluation` - item implementation
- `export InstantBaselineRenameProposal` - item implementation
- `export InstantBaselineStrategyInputs` - item implementation
- `export InstantBaselineGuardrail` - item implementation
- `export InstantBaselineStrategy` - Shared Instant Baseline decision types
- `export isInstantBaselineGuardrail` - item implementation
- `export isInstantBaselineStrategy` - item implementation

### shared/pipeline/path-utils.ts
**Purpose**: Path and filename manipulation utilities for Instant Baseline processing

**Exports**:
- `export detectOriginalDelimiter` - item implementation
- `export sanitizeBaseName` - item implementation
- `export sanitizeLiteralSegment` - item implementation
- `export splitPath` - item implementation
- `export stripExtension` - item implementation

### shared/pipeline/strategy-evaluator.ts
**Purpose**: Strategy evaluation and decision logic for Instant Baseline processing

**Exports**:
- `export createDecision` - item implementation
- `export determineFileType` - item implementation
- `export evaluateStrategy` - item implementation

### shared/pipeline/strategy-options.ts
**Purpose**: Strategy option definitions for the Instant Baseline domain

**Exports**:
- `export StrategyOption` - Strategy option definitions for the Instant Baseline domain
- `export STRATEGY_OPTIONS` - Available strategy options with user-friendly description...
- `export getAvailableStrategies` - Get all available strategy values
- `export getStrategyOption` - Get strategy option by value

### shared/settings/confirm-toast-routing.ts
**Purpose**: Helper utilities for deciding whether the confirm toast should appear.

**Exports**:
- `export ConfirmToastRouteSkip` - item implementation
- `export ConfirmToastRouteToast` - Additional metadata-driven reasons to force confirmation ...
- `export ConfirmToastSignals` - item implementation
- `export ConfirmToastRoute` - item implementation
- `export ConfirmToastSkipReason` - item implementation
- `export ConfirmToastTriggerSource` - Helper utilities for deciding whether the confirm toast s...
- `export resolveConfirmToastRoute` - item implementation

### shared/settings/crypto.test-helper.ts
**Purpose**: Fast mock crypto implementation for testing Bypasses expensive PBKDF2 and AES operations while maintaining format compatibility

**Exports**:
- `export mockDecrypt` - Fast mock decryption - just base64 decode and extract pla...
- `export mockEncrypt` - Fast mock encryption - just base64 encode with prefix and...
- `export setupMockCrypto` - Setup mock crypto for tests
Call this in beforeEach to re...

### shared/settings/crypto.ts
**Purpose**: Cryptographic utilities for secure API key storage Security Model: - Uses Web Crypto API (AES-GCM) for encryption - Derives encryption key from extension ID + salt using PBKDF2 - Provides obfuscation rather than true security (key is deterministic) - Better than plaintext: requires extension context access + code analysis - NOT secure against determined attackers with extension access Design Rationale: Browser extensions lack a secure key storage mechanism without user interaction. This implementation raises the security bar by: 1. Preventing casual inspection of API keys in storage 2. Requiring attackers to analyze extension code + have extension context 3. Using standard crypto primitives (AES-GCM, PBKDF2) Limitations: - Extension ID is public (in manifest) - Salt is in source code (public in unpacked extension) - Anyone with extension access can decrypt by running the same code - This is obfuscation + access control, not cryptographic security Format: - Encrypted data has format: "enc:v1:<base64>" - This makes it unambiguous and prevents false positives with API keys that look like base64

**Exports**:
- `export decryptApiKey` - Decrypt an encrypted API key
- `export encryptApiKey` - Encrypt a plaintext API key
- `export isEncrypted` - Check if a string is encrypted by looking for the encrypt...

### shared/settings/settings.ts
**Purpose**: Application settings persistence and state management

**Exports**:
- `export getHistoryMax` - item implementation
- `export getLastKnownSettings` - item implementation
- `export getSettings` - item implementation
- `export subscribeSettings` - item implementation
- `export updateSettings` - item implementation
- `export CloudSettings` - item implementation
- `export DebugLevel` - item implementation
- `export DebugSettings` - item implementation
- `export DEFAULT_SETTINGS` - item implementation
- `export FileType` - item implementation
- `export InstantBaselineStrategy` - item implementation
- `export isFileType` - item implementation
- `export MetadataToggles` - item implementation
- `export Mode` - item implementation
- `export PerTypeBehavior` - item implementation
- `export Separator` - item implementation
- `export Settings` - item implementation

### shared/settings/storage-state.ts
**Purpose**: Storage adapter state management for settings module This module provides a testing override mechanism for the storage adapter. In production, it simply re-exports WXT's storage API. In tests, it allows mocking storage behavior without complex setup.

**Exports**:
- `export StorageOverride` - item implementation
- `export getStorageAdapter` - item implementation
- `export getStorageUnwatch` - item implementation
- `export registerResetHook` - item implementation
- `export resetCachesForTesting` - item implementation
- `export resetStorageStateForTesting` - item implementation
- `export setStorageAdapterForTesting` - item implementation
- `export setStorageUnwatch` - item implementation

### shared/settings/testing.ts
**Purpose**: Test utilities for settings module

**Exports**:
- `export applySettingsStorageOverrideForTesting` - Applies a storage override for tests and clears cached se...
- `export resetSettingsStateForTesting` - Restores the default storage adapter and clears cached se...

### shared/settings/types.ts
**Purpose**: Type definitions for application configuration and settings

**Exports**:
- `export FileTypeEnum` - File type classification enum
Represents different file c...
- `export CloudSettings` - item implementation
- `export ConfirmModalDefaults` - item implementation
- `export ConfirmToastSettings` - item implementation
- `export DebugSettings` - item implementation
- `export LocalizationSettings` - item implementation
- `export MetadataToggles` - item implementation
- `export PerTypeBehavior` - item implementation
- `export ProcessingPreferences` - item implementation
- `export Settings` - item implementation
- `export CloudModel` - item implementation
- `export CloudTextFallbackMode` - item implementation
- `export DebugLevel` - item implementation
- `export FileType` - item implementation
- `export Mode` - Type definitions for application configuration and settings
- `export ProcessingMode` - item implementation
- `export Separator` - item implementation
- `export Theme` - item implementation
- `export UiLocale` - item implementation
- `export DEFAULT_SETTINGS` - item implementation
- `export UI_LOCALE_OPTIONS` - item implementation
- `export isFileType` - item implementation
- `export isUiLocale` - item implementation
- `export InstantBaselineStrategy` - Type definitions for application configuration and settings
- `export isInstantBaselineStrategy` - Type definitions for application configuration and settings

### shared/settings/validation.ts
**Purpose**: Settings validation and sanitization functions

**Exports**:
- `export isDebugLevel` - item implementation
- `export isLanguage` - item implementation
- `export isMode` - item implementation
- `export isPerTypeBehavior` - item implementation
- `export isSeparator` - item implementation
- `export isTheme` - item implementation
- `export sanitizeCloudSettings` - item implementation
- `export sanitizeConfirmModal` - item implementation
- `export sanitizeConfirmToast` - item implementation
- `export sanitizeDebugSettings` - item implementation
- `export sanitizeLocalization` - item implementation
- `export sanitizeMetadataToggles` - item implementation
- `export sanitizePerType` - item implementation
- `export sanitizeProcessingPreferences` - item implementation
- `export sanitizeSettings` - item implementation

### shared/state/page-context-service.ts
**Purpose**: Proxy service exposing PageContext store operations to other extension contexts.

**Exports**:
- `export PageContextPublishRequest` - item implementation
- `export PageContextReadRequest` - item implementation
- `export PageContextService` - item implementation
- `export getPageContextService` - item implementation
- `export registerPageContextService` - item implementation

### shared/state/page-context-store.ts
**Purpose**: Runtime page context storage and management

**Exports**:
- `export PageContext` - Runtime page context storage and management
- `export PageContextDetails` - item implementation
- `export clearPageContext` - item implementation
- `export getPageContext` - item implementation
- `export getPageContextByUrl` - item implementation
- `export pruneStaleContexts` - item implementation
- `export updatePageContext` - item implementation
- `export updatePageContextByUrl` - item implementation

### shared/toast/timing-constants.ts
**Purpose**: Centralized timing constants for toast behavior. All values are in milliseconds unless otherwise noted.

**Exports**:
- `export ToastTimingKey` - Type for timing constant keys (useful for testing/mocking)
- `export TOAST_TIMING` - Centralized timing constants for toast behavior

### shared/toast/types.ts
**Purpose**: Shared types for confirm toast messaging between contexts.

**Exports**:
- `export ConfirmToastCountdownControlMessage` - item implementation
- `export ConfirmToastDecisionMessage` - item implementation
- `export ConfirmToastProposal` - item implementation
- `export ConfirmToastState` - item implementation
- `export ConfirmToastStatusMessage` - item implementation
- `export ConfirmToastTimingUpdateMessage` - item implementation
- `export RenameToastProposal` - item implementation
- `export ShowConfirmToastMessage` - item implementation
- `export ShowRenameToastMessage` - item implementation
- `export ConfirmToastAction` - item implementation
- `export ConfirmToastCountdownControlAction` - item implementation
- `export ConfirmToastLifecycleState` - item implementation
- `export ConfirmToastStatusState` - item implementation

### shared/ui/ConfirmToast.accessibility.test.tsx
**Purpose**: Accessibility tests for confirm toast component

*No exports found*

### shared/ui/ConfirmToast.tsx
**Purpose**: 1 export

**Exports**:
- `export ConfirmToast` - item implementation

### shared/ui/CountdownBadge.tsx
**Purpose**: Countdown badge component Displays the auto-apply countdown with color changes when urgent

**Exports**:
- `export CountdownBadge` - Whether the countdown is paused (affects styling)

### shared/ui/FilenameLabel.tsx
**Purpose**: 1 export

**Exports**:
- `export FilenameLabel` - FilenameLabel displays a before/after filename comparison...

### shared/ui/badge-manager.ts
**Purpose**: 4 exports

**Exports**:
- `export BadgeIntent` - item implementation
- `export clearBadge` - item implementation
- `export showBadge` - item implementation
- `export showPersistentPermissionBadge` - item implementation

### shared/ui/confirm-toast-manager.test.tsx
**Purpose**: Tests for toast manager lifecycle and interactions

*No exports found*

### shared/ui/confirm-toast-manager.tsx
**Purpose**: Toast manager rendered inside the content script via Shadow DOM.

**Exports**:
- `export ConfirmToastManager` - item implementation
- `export getConfirmToastManager` - item implementation
- `export resetConfirmToastManagerForTesting` - item implementation

### shared/ui/theme-service.ts
**Purpose**: Theme management application service Handles automatic theme detection and daily reset logic

**Exports**:
- `export Theme` - Theme management application service
Handles automatic th...
- `export detectSystemTheme` - Detect system theme preference
- `export getAppropriateTheme` - Get appropriate theme (system detection + daily reset logic)
- `export markThemeReset` - Mark theme as reset for today
- `export shouldResetTheme` - Check if theme should be reset (new day)

### shared/ui/toast/keyboard-handler.ts
**Purpose**: Keyboard event handler for toast interactions.

**Exports**:
- `export createKeyboardHandler` - Creates a keyboard handler for toast interactions (Escape...

### shared/ui/toast/rename-toast.tsx
**Purpose**: RenameToast component displays confirmation feedback for applied renames. Simplified design matching ai/design/src/notification-examples.tsx

**Exports**:
- `export RenameToastProps` - item implementation
- `export RenameToastState` - RenameToast component displays confirmation feedback for ...
- `export RenameToast` - item implementation

### shared/ui/toast/toast-action-handler.ts
**Purpose**: Action handler for user interactions with toasts.

**Exports**:
- `export ActionHandlerCallbacks` - item implementation
- `export createToastActionHandler` - Creates an action handler for toast user interactions

### shared/ui/toast/toast-container.ts
**Purpose**: Toast container and Shadow DOM creation utilities.

**Exports**:
- `export TOAST_ROOT_ID` - Toast container and Shadow DOM creation utilities.
- `export createContainer` - Creates the Shadow DOM container for toast rendering

### shared/ui/toast/toast-lifecycle.ts
**Purpose**: Toast lifecycle management utilities for timer and removal handling.

**Exports**:
- `export RenameRemovalCallback` - Toast lifecycle management utilities for timer and remova...
- `export RenameToastStateMap` - Toast lifecycle management utilities for timer and remova...
- `export createToastLifecycleManager` - Creates a lifecycle manager for handling toast removal ti...

### shared/ui/toast/toast-overlay.tsx
**Purpose**: ToastOverlay renders both confirm and rename toasts in a fixed overlay.

**Exports**:
- `export ToastOverlayProps` - item implementation
- `export ToastOverlay` - item implementation

### shared/ui/toast/toast-state-manager.ts
**Purpose**: State management for confirm and rename toasts.

**Exports**:
- `export ConfirmToastStateMap` - item implementation
- `export RenameToastStateMap` - item implementation
- `export createToastStateManager` - Creates a state manager for toast collections
- `export sortToastsDescending` - item implementation

### shared/ui/toast/toast-theme-manager.ts
**Purpose**: Theme management for toast UI elements.

**Exports**:
- `export ThemeTarget` - Theme management for toast UI elements.
- `export createThemeManager` - Creates a theme manager that syncs theme between settings...

### shared/ui/useToastCountdown.ts
**Purpose**: Countdown timer hooks for auto-apply toast

**Exports**:
- `export computeCountdownSeconds` - Compute countdown seconds from timestamp or remaining mil...
- `export formatCountdown` - Format countdown seconds to display string
- `export useToastCountdown` - Hook to manage countdown timer state and pause/resume fun...

### shared/ui/useToastEditor.ts
**Purpose**: Editor hooks for toast filename editing Simplified for hover-based edit mode

**Exports**:
- `export useToastEditor` - Hook to manage filename editing state and actions
Handles...

### shared/utils/encoding.ts
**Purpose**: Lightweight text encoding helpers used during file ingestion.

**Exports**:
- `export DecodeTextBufferOptions` - item implementation
- `export DecodeTextBufferResult` - item implementation
- `export DetectedTextEncoding` - Lightweight text encoding helpers used during file ingest...
- `export TextEncoding` - Lightweight text encoding helpers used during file ingestion
- `export arrayBufferToBase64` - Convert ArrayBuffer to base64 string using browser APIs
W...
- `export decodeTextBuffer` - item implementation
- `export detectTextEncoding` - item implementation
- `export stripBom` - item implementation

### shared/utils/filename.ts
**Purpose**: Utility helpers for working with file names.

**Exports**:
- `export basename` - Extract the base filename from a path, normalising Window...
- `export extractExtension` - Extract the file extension from a filename, handling mult...
- `export fallbackNameFromUrl` - Generate a fallback filename from a URL when no filename ...
- `export truncateFilenameMiddle` - Truncate a filename in the middle while preserving the ex...

### shared/utils/id.ts
**Purpose**: Utility helpers for generating identifiers.

**Exports**:
- `export randomId` - Generate a random ID for tracking downloads and history i...

### shared/utils/prompt-sanitization.ts
**Purpose**: Prompt sanitization utilities to prevent prompt injection attacks. All untrusted inputs (filenames, URLs, page content, extracted text) must be sanitized before being inserted into AI prompts.

**Exports**:
- `export sanitizeAndQuote` - Sanitizes and wraps text in quotes for structured prompt ...
- `export sanitizeForPrompt` - Sanitizes text for safe inclusion in AI prompts
- `export sanitizeUrl` - Sanitizes URL for prompt inclusion with additional URL-sp...

### shared/utils/tab-eligibility.ts
**Purpose**: Utility helpers for checking tab eligibility for content script injection.

**Exports**:
- `export isTabEligibleForToast` - Check if a Chrome tabs
- `export isUrlEligibleForContentScript` - Check if a URL is eligible for content script injection

