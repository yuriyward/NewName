# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

├── popup/ # 2 files
│   ├── App.tsx # 1 export
│   └── main.tsx # Module exports
├── shared/ # 12 directories
│   ├── classification/ # 1 file
│   │   └── file-types.ts # 1 export
│   ├── constants/ # 1 file
│   │   └── file-constants.ts # 8 exports
│   ├── context/ # 1 file
│   │   └── page-analyzer.ts # 7 exports
│   ├── debug/ # 4 files
│   │   ├── console-helpers.ts # 2 exports
│   │   ├── logger.ts # 1 export
│   │   ├── types.ts # 5 exports
│   │   └── verbose-formatter.ts # 1 export
│   ├── history/ # 1 file
│   │   └── history.ts # 2 exports
│   ├── lifecycle/ # 1 file
│   │   └── install-tracking.ts # 4 exports
│   ├── messaging/ # 1 file
│   │   └── extension-messaging.ts # 3 exports
│   ├── naming/ # 1 file
│   │   └── policy-engine.ts # 3 exports
│   ├── pipeline/ # 6 files
│   │   ├── filename-composer.ts # 2 exports
│   │   ├── instant-baseline-strategy.ts # 3 exports
│   │   ├── instant-baseline-types.ts # 8 exports
│   │   ├── path-utils.ts # 5 exports
│   │   ├── strategy-evaluator.ts # 3 exports
│   │   └── strategy-options.ts # 4 exports
│   ├── settings/ # 2 files
│   │   ├── settings.ts # 17 exports
│   │   └── types.ts # 13 exports
│   ├── state/ # 2 files
│   │   ├── page-context-service.ts # 5 exports
│   │   └── page-context-store.ts # 7 exports
│   └── ui/ # 1 file
│       └── theme-service.ts # 5 exports
├── background.ts # 1 export
└── content.ts # 1 export

## File Details

### background.ts
**Purpose**: 1 export

**Exports**:
- `export default` - item implementation

### content.ts
**Purpose**: 1 export

**Exports**:
- `export default` - item implementation

### popup/App.tsx
**Purpose**: 1 export

**Exports**:
- `export default` - item implementation

### popup/main.tsx
**Purpose**: Module exports

*No exports found*

### shared/classification/file-types.ts
**Purpose**: 1 export

**Exports**:
- `export detectFileType` - item implementation

### shared/constants/file-constants.ts
**Purpose**: 8 exports

**Exports**:
- `export MultiPartArchiveExtension` - item implementation
- `export OriginalDelimiterCandidate` - item implementation
- `export EXTENSION_MAP` - item implementation
- `export FORBIDDEN_FILENAME_CHARS` - item implementation
- `export MIME_PREFIX_MAP` - item implementation
- `export MIME_TYPE_MAP` - item implementation
- `export MULTI_PART_ARCHIVE_EXTENSIONS` - item implementation
- `export ORIGINAL_DELIMITER_CANDIDATES` - item implementation

### shared/context/page-analyzer.ts
**Purpose**: 7 exports

**Exports**:
- `export InstantBaselineSignals` - item implementation
- `export PageContextSnapshot` - Page context extraction and URL analysis utilities
- `export deriveDomainBrand` - item implementation
- `export extractExtension` - item implementation
- `export extractFileName` - item implementation
- `export extractResolutionFromFilename` - item implementation
- `export safeDecode` - item implementation

### shared/debug/console-helpers.ts
**Purpose**: 2 exports

**Exports**:
- `export attachConsoleHelpers` - Global debug helpers attached to window for easy console ...
- `export initializeBackgroundDebug` - Initialize debug helpers in background script

### shared/debug/logger.ts
**Purpose**: 1 export

**Exports**:
- `export debugLogger` - item implementation

### shared/debug/types.ts
**Purpose**: 5 exports

**Exports**:
- `export DebugContext` - item implementation
- `export DebugEvent` - item implementation
- `export DebugPolicyResult` - item implementation
- `export InstantBaselineStrategyDebugSnapshot` - item implementation
- `export DebugLevel` - item implementation

### shared/debug/verbose-formatter.ts
**Purpose**: 1 export

**Exports**:
- `export logVerboseContext` - item implementation

### shared/history/history.ts
**Purpose**: 2 exports

**Exports**:
- `export HistoryItem` - item implementation
- `export addHistoryItem` - item implementation

### shared/lifecycle/install-tracking.ts
**Purpose**: 4 exports

**Exports**:
- `export ensureInstallDate` - Gets or creates extension installation date
- `export getInstallDate` - Retrieves stored extension installation date
- `export registerInstallDateListener` - Registers browser extension install event listener
- `export setInstallDate` - Stores extension installation date to browser storage

### shared/messaging/extension-messaging.ts
**Purpose**: 3 exports

**Exports**:
- `export ExtensionMessagingProtocol` - item implementation
- `export onExtensionMessage` - item implementation
- `export sendExtensionMessage` - item implementation

### shared/naming/policy-engine.ts
**Purpose**: 3 exports

**Exports**:
- `export FilenamePolicyInput` - item implementation
- `export FilenamePolicyResult` - item implementation
- `export applyFilenamePolicy` - item implementation

### shared/pipeline/filename-composer.ts
**Purpose**: 2 exports

**Exports**:
- `export buildOriginalWithDateRename` - item implementation
- `export buildRenameProposal` - item implementation

### shared/pipeline/instant-baseline-strategy.ts
**Purpose**: 3 exports

**Exports**:
- `export InstantBaselineComputation` - item implementation
- `export evaluateInstantBaseline` - item implementation
- `export evaluateInstantBaselineDebug` - item implementation

### shared/pipeline/instant-baseline-types.ts
**Purpose**: 8 exports

**Exports**:
- `export InstantBaselineDecision` - item implementation
- `export InstantBaselineDecisionSignals` - item implementation
- `export InstantBaselineEvaluation` - item implementation
- `export InstantBaselineRenameProposal` - item implementation
- `export InstantBaselineStrategyInputs` - item implementation
- `export InstantBaselineGuardrail` - item implementation
- `export InstantBaselineStrategy` - item implementation
- `export isInstantBaselineStrategy` - item implementation

### shared/pipeline/path-utils.ts
**Purpose**: 5 exports

**Exports**:
- `export detectOriginalDelimiter` - item implementation
- `export sanitizeBaseName` - item implementation
- `export sanitizeLiteralSegment` - item implementation
- `export splitPath` - item implementation
- `export stripExtension` - item implementation

### shared/pipeline/strategy-evaluator.ts
**Purpose**: 3 exports

**Exports**:
- `export createDecision` - item implementation
- `export determineFileType` - item implementation
- `export evaluateStrategy` - item implementation

### shared/pipeline/strategy-options.ts
**Purpose**: 4 exports

**Exports**:
- `export StrategyOption` - item implementation
- `export STRATEGY_OPTIONS` - Available strategy options with user-friendly description...
- `export getAvailableStrategies` - Get all available strategy values
- `export getStrategyOption` - Get strategy option by value

### shared/settings/settings.ts
**Purpose**: 17 exports

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
**Purpose**: 13 exports

**Exports**:
- `export CloudSettings` - item implementation
- `export DebugSettings` - item implementation
- `export MetadataToggles` - item implementation
- `export PerTypeBehavior` - item implementation
- `export SettingsV1` - item implementation
- `export DebugLevel` - item implementation
- `export FileType` - item implementation
- `export Mode` - item implementation
- `export Separator` - item implementation
- `export DEFAULT_SETTINGS` - item implementation
- `export isFileType` - item implementation
- `export InstantBaselineStrategy` - item implementation
- `export isInstantBaselineStrategy` - item implementation

### shared/state/page-context-service.ts
**Purpose**: 5 exports

**Exports**:
- `export PageContextPublishRequest` - item implementation
- `export PageContextReadRequest` - item implementation
- `export PageContextService` - item implementation
- `export getPageContextService` - item implementation
- `export registerPageContextService` - item implementation

### shared/state/page-context-store.ts
**Purpose**: 7 exports

**Exports**:
- `export PageContext` - Runtime page context storage and management
- `export clearPageContext` - item implementation
- `export getPageContext` - item implementation
- `export getPageContextByUrl` - item implementation
- `export pruneStaleContexts` - item implementation
- `export updatePageContext` - item implementation
- `export updatePageContextByUrl` - item implementation

### shared/ui/theme-service.ts
**Purpose**: 5 exports

**Exports**:
- `export Theme` - Theme management application service
Handles automatic th...
- `export detectSystemTheme` - Detect system theme preference
- `export getAppropriateTheme` - Get appropriate theme (system detection + daily reset logic)
- `export markThemeReset` - Mark theme as reset for today
- `export shouldResetTheme` - Check if theme should be reset (new day)

