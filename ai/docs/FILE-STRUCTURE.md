# Project File Structure

*Generated automatically from TypeScript source code*

## Tree Overview

├── popup/ # 2 files
│   ├── App.tsx # Main popup interface and WXT React demo component
│   └── main.tsx # React popup entry point and application bootstrapping
├── shared/ # 1 directory
│   └── integrations/ # 1 file
│       └── install-date.ts # Extension installation date tracking and storage utilities
├── background.ts # Background service worker for extension lifecycle management
└── content.ts # Content script for page integration and interaction

## File Details

### background.ts
**Purpose**: Background service worker for extension lifecycle management

**Exports**:
- `export default` - Background service worker for extension lifecycle management

### content.ts
**Purpose**: Content script for page integration and interaction

**Exports**:
- `export default` - Content script for page integration and interaction

### popup/App.tsx
**Purpose**: Main popup interface and WXT React demo component

**Exports**:
- `export default` - Main popup interface and WXT React demo component

### popup/main.tsx
**Purpose**: React popup entry point and application bootstrapping

*No exports found*

### shared/integrations/install-date.ts
**Purpose**: Extension installation date tracking and storage utilities

**Exports**:
- `export ensureInstallDate` - Gets or creates extension installation date
- `export getInstallDate` - Retrieves stored extension installation date
- `export registerInstallDateListener` - Registers browser extension install event listener
- `export setInstallDate` - Stores extension installation date to browser storage

