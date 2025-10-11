# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

background/ # 11 files, 1 directories
  ├─ toast/ # 3 files
  │ ├─ confirmation-controller.ts # Confirm toast controller manages pending confirmation requests and routing.
  │ ├─ status-broadcaster.ts # Status broadcasting utilities for confirm toast updates.
  │ └─ target-resolver.ts # Tab resolution utilities for confirm toast targeting.
  ├─ download-coordinator.ts # Download coordination logic for onDeterminingFilename events
  ├─ download-plan.ts # 2 exports
  ├─ download-post-actions.ts # 1 export
  ├─ download-tracking.ts # Download tracking helpers used by the background coordinator.
  ├─ download-types.ts # 4 exports
  ├─ download-utils.ts # 2 exports
  ├─ media-orchestrator.ts # Media analysis orchestration and upgrade proposal generation
  ├─ rename-orchestrator.ts # Orchestrates file rename operations in response to toast actions.
  ├─ rename-overlay.ts # Helper for sending rename-complete overlay notifications to the initiating tab.
  ├─ settings-cache.ts # Settings cache management for background service worker
  └─ suggest-controller.ts # Helper for coordinating the Chrome downloads suggest callback with timeouts.
downloads-permission/ # 2 files
  ├─ DownloadsPermissionPage.tsx # 1 export
  └─ main.tsx # Module exports
offscreen/ # 3 files, 1 directories
  ├─ bridge/ # 3 files
  │ ├─ sandbox-lifecycle.ts # Sandbox iframe lifecycle management
  │ ├─ sandbox-protocol.ts # Type-safe protocol definitions for Offscreen ↔ Sandbox (iframe) communication. Uses window.postMessage for parent-iframe IPC (browser standard).
  │ └─ stream-coordinator.ts # Streaming coordinator for range-based media fetching
  ├─ main.ts # Module exports
  ├─ media-analysis-handler.ts # 1 export
  └─ sandbox-bridge.ts # Bridge for communicating with the sandboxed iframe that runs MediaInfo.js. Coordinates analysis requests and response handling.
popup/ # 2 files, 1 directories
  ├─ onboarding/ # 1 file
  │ └─ DownloadsAccessScreen.tsx # 2 exports
  ├─ App.tsx # Settings popup for configuring deterministic Instant Baseline strategies
  └─ main.tsx # React popup entry point and application bootstrapping
sandbox/ # 1 file
  └─ main.ts # Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.
shared/ # 17 directories
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
  ├─ filesystem/ # 5 files
  │ ├─ directory-picker.ts # Directory picker and permission management for the File System Access API.
  │ ├─ handle-storage.ts # Persist and retrieve File System Access handles using IndexedDB. File system handles are structured-clone serialisable and must live in IndexedDB (not chrome.storage.local) so that they can be restored in offscreen documents and service workers.
  │ ├─ path-helpers.ts # Utilities for normalising download paths and managed subfolder prefixes.
  │ ├─ rename-operations.ts # Core file rename operations built on top of the File System Access API. Implements the copy+delete fallback until FileSystemHandle.move() ships for non-OPFS files. Supports nested paths, streaming for large files, and Windows reserved-name sanitisation.
  │ └─ types.ts # Shared types for File System Access operations and state.
  ├─ history/ # 4 files
  │ ├─ history.ts # File renaming action history tracking and storage orchestration. Keeps the public API focused while storage and validation live in dedicated modules.
  │ ├─ storage.ts # 2 exports
  │ ├─ types.ts # 5 exports
  │ └─ validation.ts # 4 exports
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
  ├─ onboarding/ # 1 file
  │ └─ onboarding-state.ts # Persistence helpers for onboarding progress shared across extension contexts.
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
  ├─ ui/ # 7 files, 1 directories
  │ ├─ toast/ # 8 files
  │ │ ├─ keyboard-handler.ts # Keyboard event handler for toast interactions.
  │ │ ├─ rename-toast.tsx # RenameToast component displays confirmation feedback for applied renames.
  │ │ ├─ toast-action-handler.ts # Action handler for user interactions with toasts.
  │ │ ├─ toast-container.ts # Toast container and Shadow DOM creation utilities.
  │ │ ├─ toast-lifecycle.ts # Toast lifecycle management utilities for timer and removal handling.
  │ │ ├─ toast-overlay.tsx # ToastOverlay renders both confirm and rename toasts in a fixed overlay.
  │ │ ├─ toast-state-manager.ts # State management for confirm and rename toasts.
  │ │ └─ toast-theme-manager.ts # Theme management for toast UI elements.
  │ ├─ confirm-toast-manager.test.tsx # Module exports
  │ ├─ confirm-toast-manager.tsx # Toast manager rendered inside the content script via Shadow DOM.
  │ ├─ ConfirmToast.accessibility.test.tsx # Module exports
  │ ├─ ConfirmToast.tsx # 1 export
  │ ├─ FilenameLabel.tsx # 1 export
  │ ├─ icons.ts # Shared icon exports for consistent icon usage across the application. All icons are re-exported from @heroicons/react for easy replacement if needed.
  │ └─ theme-service.ts # Theme management application service Handles automatic theme detection and daily reset logic
  └─ utils/ # 2 files
    ├─ filename.ts # Utility helpers for working with file names.
    └─ id.ts # Utility helpers for generating identifiers.
background.ts # Background service worker for download interception and renaming
content.ts # Content script for page context extraction and messaging

## File Details

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
**Purpose**: 2 exports

**Exports**:
- `export DownloadPlan` - item implementation
- `export buildDownloadPlan` - item implementation

### background/download-post-actions.ts
**Purpose**: 1 export

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
**Purpose**: 4 exports

**Exports**:
- `export DeterminingItem` - item implementation
- `export DeterminingListener` - item implementation
- `export SuggestCallback` - item implementation
- `export SuggestPayload` - item implementation

### background/download-utils.ts
**Purpose**: 2 exports

**Exports**:
- `export isMediaFileType` - item implementation
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
- `export executePdfAnalysisRename` - Execute PDF analysis rename (called by alarm handler)
Can...
- `export schedulePdfAnalysisForDownload` - Schedule PDF analysis rename for auto-downloaded files (c...

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
- `export QueueConfirmToastOptions` - item implementation
- `export createConfirmToastController` - item implementation

### background/toast/status-broadcaster.ts
**Purpose**: Status broadcasting utilities for confirm toast updates.

**Exports**:
- `export StatusBroadcastEntry` - item implementation
- `export emitStatus` - Emit status update to all tabs that have received this toast

### background/toast/target-resolver.ts
**Purpose**: Tab resolution utilities for confirm toast targeting.

**Exports**:
- `export extractTabId` - Extract tab ID from a target (either number or SendMessag...
- `export resolveTarget` - Resolve the active tab to use as the target for displayin...

### content.ts
**Purpose**: Content script for page context extraction and messaging

**Exports**:
- `export default` - item implementation

### downloads-permission/DownloadsPermissionPage.tsx
**Purpose**: 1 export

**Exports**:
- `export DownloadsPermissionPage` - item implementation

### downloads-permission/main.tsx
**Purpose**: Module exports

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

### popup/onboarding/DownloadsAccessScreen.tsx
**Purpose**: 2 exports

**Exports**:
- `export DownloadsAccessScreenProps` - item implementation
- `export DownloadsAccessScreen` - item implementation

### sandbox/main.ts
**Purpose**: Sandboxed iframe for MediaInfo.js WASM execution. Runs in a sandbox context with unsafe-eval allowed for Emscripten glue code.

*No exports found*

### shared/classification/file-types.ts
**Purpose**: File type detection from MIME and extensions

**Exports**:
- `export detectFileType` - item implementation

### shared/classification/sensitive-content.ts
**Purpose**: Sensitive content detection heuristics for confirmation routing.

**Exports**:
- `export SensitiveDetectionInput` - item implementation
- `export SensitiveDetectionMatch` - item implementation
- `export SensitiveDetectionResult` - item implementation
- `export SensitiveReason` - Sensitive content detection heuristics for confirmation r...
- `export detectSensitiveContent` - item implementation

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

### shared/filesystem/directory-picker.ts
**Purpose**: Directory picker and permission management for the File System Access API.

**Exports**:
- `export ManagedSubfolderRequiredError` - Request read/write access to the Downloads directory
- `export DirectoryHandleWithPermission` - Directory picker and permission management for the File S...
- `export DownloadsAccessResult` - item implementation
- `export isHandleValid` - Determine whether the provided handle is still valid and ...
- `export requestDownloadsAccess` - item implementation
- `export verifyDirectoryPermission` - Verify (and if necessary request) read/write permission f...

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
**Purpose**: 2 exports

**Exports**:
- `export readHistory` - item implementation
- `export writeHistory` - item implementation

### shared/history/types.ts
**Purpose**: 5 exports

**Exports**:
- `export HistoryItem` - item implementation
- `export HistoryMediaMetadata` - item implementation
- `export PendingAnalysisRename` - item implementation
- `export UpgradeProposal` - item implementation
- `export MAX_PENDING_ANALYSIS_AGE_MS` - item implementation

### shared/history/validation.ts
**Purpose**: 4 exports

**Exports**:
- `export isHistoryMediaMetadata` - item implementation
- `export isPendingAnalysisRename` - item implementation
- `export isUpgradeProposal` - item implementation
- `export isValidHistoryItem` - item implementation

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
**Purpose**: Debug logging utilities for media analysis pipeline

**Exports**:
- `export MediaDebugSettings` - Debug logging utilities for media analysis pipeline
- `export logMediaDebug` - item implementation

### shared/integrations/mediainfo/index.ts
**Purpose**: Main entry point for MediaInfo integration and media file analysis

**Exports**:
- `export MediaAnalysisError` - item implementation
- `export AnalyzeMediaFromBlobResult` - item implementation
- `export AnalyzeMediaFromUrlOptions` - HTTP Range request reader for efficient partial file fetc...
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

### shared/integrations/mediainfo/range-reader.ts
**Purpose**: HTTP Range request reader for efficient partial file fetching

**Exports**:
- `export RangeFetchReader` - item implementation
- `export RangeFetchOptions` - HTTP Range request reader for efficient partial file fetc...

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
- `export ExtensionMessagingProtocol` - item implementation
- `export onExtensionMessage` - item implementation
- `export sendExtensionMessage` - item implementation
- `export offscreenHandshake` - item implementation
- `export requestMediaAnalysis` - item implementation
- `export requestPendingConfirmToasts` - item implementation
- `export sendConfirmToastDecision` - item implementation
- `export sendConfirmToastStatus` - item implementation
- `export sendShowConfirmToast` - item implementation
- `export sendShowRenameToast` - item implementation
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

### shared/onboarding/onboarding-state.ts
**Purpose**: Persistence helpers for onboarding progress shared across extension contexts.

**Exports**:
- `export OnboardingState` - Persistence helpers for onboarding progress shared across...
- `export OnboardingStatus` - Persistence helpers for onboarding progress shared across...
- `export getOnboardingState` - item implementation
- `export markOnboardingCompleted` - item implementation
- `export markOnboardingSkipped` - item implementation
- `export resetOnboardingState` - item implementation

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
**Purpose**: Internal storage adapter state management for testing

**Exports**:
- `export StorageOverride` - Internal storage adapter state management for testing
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
- `export CloudSettings` - item implementation
- `export ConfirmModalDefaults` - item implementation
- `export ConfirmToastSettings` - item implementation
- `export DebugSettings` - item implementation
- `export LocalizationSettings` - item implementation
- `export MetadataToggles` - item implementation
- `export PerTypeBehavior` - item implementation
- `export Settings` - item implementation
- `export DebugLevel` - item implementation
- `export FileType` - item implementation
- `export Mode` - Type definitions for application configuration and settings
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
- `export ConfirmToastDecisionMessage` - item implementation
- `export ConfirmToastProposal` - item implementation
- `export ConfirmToastState` - item implementation
- `export ConfirmToastStatusMessage` - item implementation
- `export RenameToastProposal` - item implementation
- `export ShowConfirmToastMessage` - item implementation
- `export ShowRenameToastMessage` - item implementation
- `export ConfirmToastAction` - item implementation
- `export ConfirmToastLifecycleState` - item implementation
- `export ConfirmToastStatusState` - item implementation

### shared/ui/ConfirmToast.accessibility.test.tsx
**Purpose**: Module exports

*No exports found*

### shared/ui/ConfirmToast.tsx
**Purpose**: 1 export

**Exports**:
- `export ConfirmToast` - item implementation

### shared/ui/FilenameLabel.tsx
**Purpose**: 1 export

**Exports**:
- `export FilenameLabel` - Shared component for displaying filename transitions (ori...

### shared/ui/confirm-toast-manager.test.tsx
**Purpose**: Module exports

*No exports found*

### shared/ui/confirm-toast-manager.tsx
**Purpose**: Toast manager rendered inside the content script via Shadow DOM.

**Exports**:
- `export ConfirmToastManager` - item implementation
- `export getConfirmToastManager` - item implementation
- `export resetConfirmToastManagerForTesting` - item implementation

### shared/ui/icons.ts
**Purpose**: Shared icon exports for consistent icon usage across the application. All icons are re-exported from @heroicons/react for easy replacement if needed.

*No exports found*

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
**Purpose**: RenameToast component displays confirmation feedback for applied renames.

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

### shared/utils/filename.ts
**Purpose**: Utility helpers for working with file names.

**Exports**:
- `export basename` - Extract the base filename from a path, normalising Window...
- `export fallbackNameFromUrl` - Generate a fallback filename from a URL when no filename ...

### shared/utils/id.ts
**Purpose**: Utility helpers for generating identifiers.

**Exports**:
- `export randomId` - Generate a random ID for tracking downloads and history i...

