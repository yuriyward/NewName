# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

├── background/ # 5 files
│   ├── download-coordinator.ts # Download coordination logic for onDeterminingFilename events
│   ├── download-tracking.ts # Download tracking helpers used by the background coordinator.
│   ├── media-orchestrator.ts # Media analysis orchestration and upgrade proposal generation
│   ├── settings-cache.ts # Settings cache management for background service worker
│   └── suggest-controller.ts # Helper for coordinating the Chrome downloads suggest callback with timeouts.
├── offscreen/ # 3 files, 1 directories
│   ├── bridge/ # 3 files
│   │   ├── sandbox-lifecycle.ts # Sandbox iframe lifecycle management
│   │   ├── sandbox-protocol.ts # Type-safe protocol definitions for Offscreen ↔ Sandbox (iframe) communication. Uses window.postMessage for parent-iframe IPC (browser standard).
│   │   └── stream-coordinator.ts # Streaming coordinator for range-based media fetching
│   ├── main.ts # Module exports
│   ├── media-analysis-handler.ts # 1 export
│   └── sandbox-bridge.ts # Bridge for communicating with the sandboxed iframe that runs MediaInfo.js. Coordinates analysis requests and response handling.
├── popup/ # 2 files
│   ├── App.tsx # Settings popup for configuring deterministic Instant Baseline strategies
│   └── main.tsx # React popup entry point and application bootstrapping
├── sandbox/ # 1 file
│   └── main.ts # Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.
├── shared/ # 14 directories
│   ├── classification/ # 1 file
│   │   └── file-types.ts # File type detection from MIME and extensions
│   ├── constants/ # 1 file
│   │   └── file-constants.ts # Shared file-related constants used across the application
│   ├── context/ # 1 file
│   │   └── page-analyzer.ts # Page context extraction and URL analysis utilities
│   ├── debug/ # 4 files
│   │   ├── console-helpers.ts # Console helper functions for debugging
│   │   ├── logger.ts # Debug logging utilities for troubleshooting rename decisions
│   │   ├── types.ts # Debug types and interfaces for troubleshooting rename decisions
│   │   └── verbose-formatter.ts # Verbose debug formatting utilities
│   ├── history/ # 1 file
│   │   └── history.ts # File renaming action history tracking and storage
│   ├── integrations/ # 1 directory
│   │   └── mediainfo/ # 9 files, 1 directories
│   │       ├── parsers/ # 2 files
│   │       │   ├── duration-parser.ts # Duration parsing utilities for MediaInfo track data
│   │       │   └── track-parser.ts # Track parsing utilities for MediaInfo video and audio tracks
│   │       ├── constants.ts # Centralized constants for MediaInfo integration and analysis pipeline.
│   │       ├── debug.ts # 2 exports
│   │       ├── index.ts # 7 exports
│   │       ├── media-analysis-queue.ts # 2 exports
│   │       ├── media-summary.ts # 4 exports
│   │       ├── mediainfo-loader.ts # 4 exports
│   │       ├── messages.ts # 4 exports
│   │       ├── offscreen-coordinator.ts # Offscreen document lifecycle and readiness coordination
│   │       └── range-reader.ts # 2 exports
│   ├── lifecycle/ # 1 file
│   │   └── install-tracking.ts # Extension installation date tracking and storage utilities
│   ├── messaging/ # 1 file
│   │   └── extension-messaging.ts # Central extension messaging protocol using @webext-core/messaging
│   ├── naming/ # 2 files
│   │   ├── media-qualifiers.ts # Extract media metadata qualifiers for filename enhancement
│   │   └── policy-engine.ts # Filename generation policies and formatting rules
│   ├── pipeline/ # 6 files
│   │   ├── filename-composer.ts # Filename composition and building utilities for Instant Baseline processing
│   │   ├── instant-baseline-strategy.ts # Instant Baseline deterministic strategy evaluator
│   │   ├── instant-baseline-types.ts # Shared Instant Baseline decision types
│   │   ├── path-utils.ts # Path and filename manipulation utilities for Instant Baseline processing
│   │   ├── strategy-evaluator.ts # Strategy evaluation and decision logic for Instant Baseline processing
│   │   └── strategy-options.ts # Strategy option definitions for the Instant Baseline domain
│   ├── settings/ # 2 files
│   │   ├── settings.ts # Application settings persistence and state management
│   │   └── types.ts # Type definitions for application configuration and settings
│   ├── state/ # 2 files
│   │   ├── page-context-service.ts # Proxy service exposing PageContext store operations to other extension contexts.
│   │   └── page-context-store.ts # Runtime page context storage and management
│   ├── ui/ # 1 file
│   │   └── theme-service.ts # Theme management application service Handles automatic theme detection and daily reset logic
│   └── utils/ # 2 files
│       ├── filename.ts # Utility helpers for working with file names.
│       └── id.ts # Utility helpers for generating identifiers.
├── background.ts # Background service worker for download interception and renaming
└── content.ts # Content script for page context extraction and messaging

## File Details

### background.ts
**Purpose**: Background service worker for download interception and renaming

**Exports**:
- `export default` - item implementation

### background/download-coordinator.ts
**Purpose**: Download coordination logic for onDeterminingFilename events

**Exports**:
- `export DeterminingItem` - item implementation
- `export DeterminingListener` - item implementation
- `export SuggestCallback` - item implementation
- `export SuggestPayload` - item implementation
- `export createDeterminingListener` - Create the determining listener that processes download e...
- `export isMediaFileType` - Check if the file type is a media file (audio or video)
- `export processDeterminingFilename` - Process the determining filename event and suggest a rena...
- `export shouldRenameType` - Check if renaming is enabled for the given file type

### background/download-tracking.ts
**Purpose**: Download tracking helpers used by the background coordinator.

**Exports**:
- `export DownloadTrackingEntry` - Download tracking helpers used by the background coordina...
- `export pruneDownloadTrackingMap` - item implementation
- `export recordDownloadTracking` - item implementation
- `export resetDownloadTrackingForTesting` - item implementation

### background/media-orchestrator.ts
**Purpose**: Media analysis orchestration and upgrade proposal generation

**Exports**:
- `export applyMediaAnalysisResponse` - Apply media analysis response to history item and generat...
- `export toMediaDebugSettings` - Convert settings to media debug settings if debug is enabled

### background/settings-cache.ts
**Purpose**: Settings cache management for background service worker

**Exports**:
- `export ensureSettingsCache` - Initialize a cached settings reader that automatically up...

### background/suggest-controller.ts
**Purpose**: Helper for coordinating the Chrome downloads suggest callback with timeouts.

**Exports**:
- `export SuggestController` - Helper for coordinating the Chrome downloads suggest call...
- `export createSuggestController` - item implementation

### content.ts
**Purpose**: Content script for page context extraction and messaging

**Exports**:
- `export default` - item implementation

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

### offscreen/main.ts
**Purpose**: Module exports

*No exports found*

### offscreen/media-analysis-handler.ts
**Purpose**: 1 export

**Exports**:
- `export initializeMediaAnalysisHandler` - item implementation

### offscreen/sandbox-bridge.ts
**Purpose**: Bridge for communicating with the sandboxed iframe that runs MediaInfo.js. Coordinates analysis requests and response handling.

**Exports**:
- `export destroySandbox` - item implementation
- `export fetchAndAnalyzeFromUrl` - Fetches media from URL using streaming and analyzes it vi...
- `export ensureSandboxReady` - item implementation

### popup/App.tsx
**Purpose**: Settings popup for configuring deterministic Instant Baseline strategies

**Exports**:
- `export default` - item implementation

### popup/main.tsx
**Purpose**: React popup entry point and application bootstrapping

*No exports found*

### sandbox/main.ts
**Purpose**: Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.

*No exports found*

### shared/classification/file-types.ts
**Purpose**: File type detection from MIME and extensions

**Exports**:
- `export detectFileType` - item implementation

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

### shared/context/page-analyzer.ts
**Purpose**: Page context extraction and URL analysis utilities

**Exports**:
- `export InstantBaselineSignals` - item implementation
- `export PageContextSnapshot` - Page context extraction and URL analysis utilities
- `export deriveDomainBrand` - item implementation
- `export extractExtension` - item implementation
- `export extractFileName` - item implementation
- `export extractResolutionFromFilename` - item implementation
- `export safeDecode` - item implementation

### shared/debug/console-helpers.ts
**Purpose**: Console helper functions for debugging

**Exports**:
- `export attachConsoleHelpers` - Global debug helpers attached to window for easy console ...
- `export initializeBackgroundDebug` - Initialize debug helpers in background script

### shared/debug/logger.ts
**Purpose**: Debug logging utilities for troubleshooting rename decisions

**Exports**:
- `export debugLogger` - item implementation

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

### shared/history/history.ts
**Purpose**: File renaming action history tracking and storage

**Exports**:
- `export HistoryItem` - item implementation
- `export HistoryMediaMetadata` - item implementation
- `export UpgradeProposal` - item implementation
- `export addHistoryItem` - item implementation
- `export getHistory` - item implementation
- `export updateHistoryItem` - item implementation

### shared/integrations/mediainfo/constants.ts
**Purpose**: Centralized constants for MediaInfo integration and analysis pipeline.

**Exports**:
- `export ANALYSIS_TIMEOUT_MS` - Maximum time to wait for media analysis to complete in th...
- `export MEDIA_ANALYSIS_MAX_WAIT_MS` - Maximum time to wait for media analysis before suggesting...
- `export OFFSCREEN_HANDSHAKE_BACKOFF_MS` - Base backoff delay in milliseconds for offscreen handshak...
- `export OFFSCREEN_HANDSHAKE_MAX_RETRIES` - Maximum number of retry attempts for offscreen document h...
- `export SANDBOX_READY_TIMEOUT_MS` - Maximum time to wait for sandbox iframe to send ready signal
- `export SUGGEST_TIMEOUT_MS` - Total timeout for filename suggestion in download interce...

### shared/integrations/mediainfo/debug.ts
**Purpose**: 2 exports

**Exports**:
- `export MediaDebugSettings` - item implementation
- `export logMediaDebug` - item implementation

### shared/integrations/mediainfo/index.ts
**Purpose**: 7 exports

**Exports**:
- `export MediaAnalysisError` - item implementation
- `export AnalyzeMediaFromBlobResult` - item implementation
- `export AnalyzeMediaFromUrlOptions` - item implementation
- `export AnalyzeMediaFromUrlResult` - item implementation
- `export analyzeMediaFromBlob` - item implementation
- `export analyzeMediaFromUrl` - item implementation
- `export MEDIAINFO_CHUNK_SIZE` - item implementation

### shared/integrations/mediainfo/media-analysis-queue.ts
**Purpose**: 2 exports

**Exports**:
- `export enqueueMediaAnalysis` - item implementation
- `export resetMediaAnalysisQueueForTesting` - item implementation

### shared/integrations/mediainfo/media-summary.ts
**Purpose**: 4 exports

**Exports**:
- `export MediaMetadataSummary` - item implementation
- `export summariseMediaInfo` - item implementation
- `export AudioTrackSummary` - item implementation
- `export VideoTrackSummary` - item implementation

### shared/integrations/mediainfo/mediainfo-loader.ts
**Purpose**: 4 exports

**Exports**:
- `export MediaInfoInstance` - item implementation
- `export MEDIAINFO_CHUNK_SIZE` - item implementation
- `export getMediaInfoInstance` - item implementation
- `export resetMediaInfoInstanceForTesting` - item implementation

### shared/integrations/mediainfo/messages.ts
**Purpose**: 4 exports

**Exports**:
- `export MediaAnalysisFailure` - item implementation
- `export MediaAnalysisRequest` - item implementation
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

### shared/integrations/mediainfo/range-reader.ts
**Purpose**: 2 exports

**Exports**:
- `export RangeFetchReader` - item implementation
- `export RangeFetchOptions` - item implementation

### shared/lifecycle/install-tracking.ts
**Purpose**: Extension installation date tracking and storage utilities

**Exports**:
- `export ensureInstallDate` - Gets or creates extension installation date
- `export getInstallDate` - Retrieves stored extension installation date
- `export registerInstallDateListener` - Registers browser extension install event listener
- `export setInstallDate` - Stores extension installation date to browser storage

### shared/messaging/extension-messaging.ts
**Purpose**: Central extension messaging protocol using @webext-core/messaging

**Exports**:
- `export ExtensionMessagingProtocol` - Central extension messaging protocol using @webext-core/m...
- `export onExtensionMessage` - item implementation
- `export sendExtensionMessage` - item implementation
- `export offscreenHandshake` - item implementation
- `export requestMediaAnalysis` - item implementation
- `export signalOffscreenReady` - item implementation

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

### shared/pipeline/filename-composer.ts
**Purpose**: Filename composition and building utilities for Instant Baseline processing

**Exports**:
- `export buildOriginalWithDateRename` - item implementation
- `export buildRenameProposal` - item implementation

### shared/pipeline/instant-baseline-strategy.ts
**Purpose**: Instant Baseline deterministic strategy evaluator

**Exports**:
- `export InstantBaselineComputation` - item implementation
- `export evaluateInstantBaseline` - item implementation
- `export evaluateInstantBaselineDebug` - item implementation

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

### shared/settings/settings.ts
**Purpose**: Application settings persistence and state management

**Exports**:
- `export __resetSettingsStateForTesting` - item implementation
- `export __setSettingsStorageForTesting` - Test-only hook for swapping the storage adapter
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

### shared/settings/types.ts
**Purpose**: Type definitions for application configuration and settings

**Exports**:
- `export CloudSettings` - item implementation
- `export ConfirmModalDefaults` - item implementation
- `export DebugSettings` - item implementation
- `export LocalizationSettings` - item implementation
- `export MetadataToggles` - item implementation
- `export PerTypeBehavior` - item implementation
- `export Settings` - item implementation
- `export DebugLevel` - item implementation
- `export FileType` - item implementation
- `export Mode` - Type definitions for application configuration and settings
- `export Separator` - item implementation
- `export UiLocale` - item implementation
- `export DEFAULT_SETTINGS` - item implementation
- `export UI_LOCALE_OPTIONS` - item implementation
- `export isFileType` - item implementation
- `export isUiLocale` - item implementation
- `export InstantBaselineStrategy` - Type definitions for application configuration and settings
- `export isInstantBaselineStrategy` - Type definitions for application configuration and settings

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
- `export clearPageContext` - item implementation
- `export getPageContext` - item implementation
- `export getPageContextByUrl` - item implementation
- `export pruneStaleContexts` - item implementation
- `export updatePageContext` - item implementation
- `export updatePageContextByUrl` - item implementation

### shared/ui/theme-service.ts
**Purpose**: Theme management application service Handles automatic theme detection and daily reset logic

**Exports**:
- `export Theme` - Theme management application service
Handles automatic th...
- `export detectSystemTheme` - Detect system theme preference
- `export getAppropriateTheme` - Get appropriate theme (system detection + daily reset logic)
- `export markThemeReset` - Mark theme as reset for today
- `export shouldResetTheme` - Check if theme should be reset (new day)

### shared/utils/filename.ts
**Purpose**: Utility helpers for working with file names.

**Exports**:
- `export basename` - Extract the base filename from a path, normalising Window...
- `export fallbackNameFromUrl` - Generate a fallback filename from a URL when no filename ...

### shared/utils/id.ts
**Purpose**: Utility helpers for generating identifiers.

**Exports**:
- `export randomId` - Generate a random ID for tracking downloads and history i...

