# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

├── popup/ # 2 files
│   ├── App.tsx # Settings popup for configuring deterministic Instant Baseline strategies
│   └── main.tsx # React popup entry point and application bootstrapping
├── shared/ # 10 directories
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
│   ├── pipeline/ # 2 files
│   │   ├── instant-baseline-strategy.ts # Instant Baseline deterministic strategy evaluator
│   │   └── instant-baseline-types.ts # Shared Instant Baseline decision types
│   ├── settings/ # 2 files
│   │   ├── settings.ts # Application settings persistence and state management
│   │   └── types.ts # Type definitions for application configuration and settings
│   └── state/ # 1 file
│       └── page-context-store.ts # Runtime page context storage and management
├── background.ts # Background service worker for download interception and renaming
└── content.ts # Content script for page context extraction and messaging

## File Details

### background.ts
**Purpose**: Background service worker for download interception and renaming

**Exports**:
- `export default` - item implementation

### content.ts
**Purpose**: Content script for page context extraction and messaging

**Exports**:
- `export default` - item implementation

### popup/App.tsx
**Purpose**: Settings popup for configuring deterministic Instant Baseline strategies

**Exports**:
- `export default` - item implementation

### popup/main.tsx
**Purpose**: React popup entry point and application bootstrapping

*No exports found*

### shared/classification/file-types.ts
**Purpose**: File type detection from MIME and extensions

**Exports**:
- `export detectFileType` - item implementation

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
- `export addHistoryItem` - item implementation

### shared/lifecycle/install-tracking.ts
**Purpose**: Extension installation date tracking and storage utilities

**Exports**:
- `export ensureInstallDate` - Gets or creates extension installation date
- `export getInstallDate` - Retrieves stored extension installation date
- `export registerInstallDateListener` - Registers browser extension install event listener
- `export setInstallDate` - Stores extension installation date to browser storage

### shared/messaging/content-messages.ts
**Purpose**: Message type definitions for content-background communication

**Exports**:
- `export ContentToBackgroundMessage` - Message type definitions for content-background communica...

### shared/naming/policy-engine.ts
**Purpose**: Filename generation policies and formatting rules

**Exports**:
- `export FilenamePolicyInput` - Filename generation policies and formatting rules
- `export FilenamePolicyResult` - item implementation
- `export applyFilenamePolicy` - item implementation

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
- `export InstantBaselineGuardrail` - Shared Instant Baseline decision types

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
- `export SettingsV1` - item implementation

### shared/settings/types.ts
**Purpose**: Type definitions for application configuration and settings

**Exports**:
- `export CloudSettings` - item implementation
- `export DebugSettings` - item implementation
- `export MetadataToggles` - item implementation
- `export PerTypeBehavior` - item implementation
- `export SettingsV1` - item implementation
- `export DebugLevel` - Type definitions for application configuration and settings
- `export FileType` - Type definitions for application configuration and settings
- `export InstantBaselineStrategy` - item implementation
- `export Mode` - Type definitions for application configuration and settings
- `export Separator` - Type definitions for application configuration and settings
- `export DEFAULT_SETTINGS` - item implementation
- `export isFileType` - item implementation
- `export isInstantBaselineStrategy` - item implementation

### shared/state/page-context-store.ts
**Purpose**: Runtime page context storage and management

**Exports**:
- `export PageContext` - Runtime page context storage and management
- `export clearPageContext` - item implementation
- `export getPageContext` - item implementation
- `export pruneStaleContexts` - item implementation
- `export updatePageContext` - item implementation

