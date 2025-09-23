# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

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
**Purpose**: Main popup interface and WXT React demo component

**Exports**:
- `export default` - Main popup interface and WXT React demo component

### popup/main.tsx
**Purpose**: React popup entry point and application bootstrapping

*No exports found*

### shared/analysis/candidate-ranking.ts
**Purpose**: Content candidate scoring and ranking algorithms

**Exports**:
- `export Candidate` - item implementation
- `export addCandidate` - item implementation
- `export addDebugCandidate` - item implementation
- `export selectBestCandidate` - item implementation
- `export selectBestDebugCandidate` - item implementation

### shared/analysis/content-filtering.ts
**Purpose**: Text filtering and content cleaning utilities

**Exports**:
- `export CandidateReason` - item implementation
- `export BASE_STOPWORDS` - Text filtering and content cleaning utilities
- `export FILENAME_STOPWORDS` - item implementation
- `export GENERIC_SUBJECT_TOKENS` - item implementation
- `export LINK_STOPWORDS` - item implementation
- `export LINK_TRAILING_STOPWORDS` - item implementation
- `export SEGMENT_SPLIT_REGEX` - item implementation
- `export URL_STOPWORDS` - item implementation
- `export computeGenericPenalty` - item implementation
- `export looksLikeHash` - item implementation
- `export normaliseCandidate` - item implementation
- `export pickBestSegment` - item implementation
- `export shouldKeepToken` - item implementation
- `export trimLinkTokens` - item implementation

### shared/analysis/heuristics-orchestrator.ts
**Purpose**: Phase 1 content analysis orchestration engine

**Exports**:
- `export Phase1HeuristicResult` - item implementation
- `export runPhase1Heuristics` - item implementation
- `export runPhase1HeuristicsDebug` - item implementation

### shared/analysis/qualifier-rules.ts
**Purpose**: Metadata qualification rules and enrichment logic

**Exports**:
- `export DeriveQualifiersParams` - item implementation
- `export QualifierState` - item implementation
- `export QualifierRule` - item implementation
- `export applyDocumentDateQualifier` - item implementation
- `export applyMediaSpecQualifier` - item implementation
- `export applySourceQualifier` - item implementation
- `export QUALIFIER_RULES` - item implementation
- `export deriveQualifiers` - item implementation
- `export pushQualifier` - item implementation

### shared/classification/file-types.ts
**Purpose**: File type detection from MIME and extensions

**Exports**:
- `export detectFileType` - item implementation

### shared/context/page-analyzer.ts
**Purpose**: Page context extraction and URL analysis utilities

**Exports**:
- `export PageContextSnapshot` - Page context extraction and URL analysis utilities
- `export Phase1Signals` - item implementation
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
- `export DebugCandidate` - item implementation
- `export DebugContext` - item implementation
- `export DebugEvent` - item implementation
- `export DebugHeuristicResult` - item implementation
- `export DebugPolicyResult` - item implementation
- `export DebugQualifierResult` - item implementation
- `export DebugLevel` - item implementation

### shared/debug/verbose-formatter.ts
**Purpose**: Verbose debug formatting utilities

**Exports**:
- `export logVerboseContext` - Verbose debug formatting utilities

### shared/history/history.ts
**Purpose**: File renaming action history tracking and storage

**Exports**:
- `export HistoryItem` - item implementation
- `export addHistoryItem` - item implementation
- `export clearHistory` - item implementation
- `export listHistory` - item implementation

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
- `export applyFilenamePolicyDebug` - item implementation

### shared/pipeline/phase1-coordinator.ts
**Purpose**: Phase 1 renaming pipeline coordination and orchestration

**Exports**:
- `export Phase1Outcome` - item implementation
- `export computePhase1Outcome` - item implementation
- `export computePhase1OutcomeDebug` - item implementation

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
- `export Mode` - Type definitions for application configuration and settings
- `export Separator` - Type definitions for application configuration and settings
- `export DEFAULT_SETTINGS` - item implementation
- `export isFileType` - item implementation

### shared/state/page-context-store.ts
**Purpose**: Runtime page context storage and management

**Exports**:
- `export PageContext` - Runtime page context storage and management
- `export clearPageContext` - item implementation
- `export getPageContext` - item implementation
- `export pruneStaleContexts` - item implementation
- `export updatePageContext` - item implementation

