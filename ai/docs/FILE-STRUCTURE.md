# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

├── popup/ # 2 files
│   ├── App.tsx # Main popup interface and WXT React demo component
│   └── main.tsx # React popup entry point and application bootstrapping
├── shared/ # 10 directories
│   ├── analysis/ # 4 files
│   │   ├── candidate-ranking.ts # 3 exports
│   │   ├── content-filtering.ts # 14 exports
│   │   ├── heuristics-orchestrator.ts # 2 exports
│   │   └── qualifier-rules.ts # 9 exports
│   ├── classification/ # 1 file
│   │   └── file-types.ts # 1 export
│   ├── context/ # 1 file
│   │   └── page-analyzer.ts # 7 exports
│   ├── history/ # 1 file
│   │   └── history.ts # 4 exports
│   ├── lifecycle/ # 1 file
│   │   └── install-tracking.ts # Extension installation date tracking and storage utilities
│   ├── messaging/ # 1 file
│   │   └── content-messages.ts # 1 export
│   ├── naming/ # 1 file
│   │   └── policy-engine.ts # 3 exports
│   ├── pipeline/ # 1 file
│   │   └── phase1-coordinator.ts # 2 exports
│   ├── settings/ # 2 files
│   │   ├── settings.ts # 14 exports
│   │   └── types.ts # 9 exports
│   └── state/ # 1 file
│       └── page-context-store.ts # 5 exports
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
**Purpose**: Main popup interface and WXT React demo component

**Exports**:
- `export default` - Main popup interface and WXT React demo component

### popup/main.tsx
**Purpose**: React popup entry point and application bootstrapping

*No exports found*

### shared/analysis/candidate-ranking.ts
**Purpose**: 3 exports

**Exports**:
- `export Candidate` - item implementation
- `export addCandidate` - item implementation
- `export selectBestCandidate` - item implementation

### shared/analysis/content-filtering.ts
**Purpose**: 14 exports

**Exports**:
- `export CandidateReason` - item implementation
- `export BASE_STOPWORDS` - item implementation
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
**Purpose**: 2 exports

**Exports**:
- `export Phase1HeuristicResult` - item implementation
- `export runPhase1Heuristics` - item implementation

### shared/analysis/qualifier-rules.ts
**Purpose**: 9 exports

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
**Purpose**: 1 export

**Exports**:
- `export detectFileType` - item implementation

### shared/context/page-analyzer.ts
**Purpose**: 7 exports

**Exports**:
- `export PageContextSnapshot` - item implementation
- `export Phase1Signals` - item implementation
- `export deriveDomainBrand` - item implementation
- `export extractExtension` - item implementation
- `export extractFileName` - item implementation
- `export extractResolutionFromFilename` - item implementation
- `export safeDecode` - item implementation

### shared/history/history.ts
**Purpose**: 4 exports

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
**Purpose**: 1 export

**Exports**:
- `export ContentToBackgroundMessage` - item implementation

### shared/naming/policy-engine.ts
**Purpose**: 3 exports

**Exports**:
- `export FilenamePolicyInput` - item implementation
- `export FilenamePolicyResult` - item implementation
- `export applyFilenamePolicy` - item implementation

### shared/pipeline/phase1-coordinator.ts
**Purpose**: 2 exports

**Exports**:
- `export Phase1Outcome` - item implementation
- `export computePhase1Outcome` - item implementation

### shared/settings/settings.ts
**Purpose**: 14 exports

**Exports**:
- `export getHistoryMax` - item implementation
- `export getLastKnownSettings` - item implementation
- `export getSettings` - item implementation
- `export subscribeSettings` - item implementation
- `export updateSettings` - item implementation
- `export CloudSettings` - item implementation
- `export DEFAULT_SETTINGS` - item implementation
- `export FileType` - item implementation
- `export isFileType` - item implementation
- `export MetadataToggles` - item implementation
- `export Mode` - item implementation
- `export PerTypeBehavior` - item implementation
- `export Separator` - item implementation
- `export SettingsV1` - item implementation

### shared/settings/types.ts
**Purpose**: 9 exports

**Exports**:
- `export CloudSettings` - item implementation
- `export MetadataToggles` - item implementation
- `export PerTypeBehavior` - item implementation
- `export SettingsV1` - item implementation
- `export FileType` - item implementation
- `export Mode` - item implementation
- `export Separator` - item implementation
- `export DEFAULT_SETTINGS` - item implementation
- `export isFileType` - item implementation

### shared/state/page-context-store.ts
**Purpose**: 5 exports

**Exports**:
- `export PageContext` - item implementation
- `export clearPageContext` - item implementation
- `export getPageContext` - item implementation
- `export pruneStaleContexts` - item implementation
- `export updatePageContext` - item implementation

