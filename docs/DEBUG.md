# Debug Mode for NewName

The debug mode provides comprehensive logging for troubleshooting rename decisions in the Phase 1 pipeline.

## Enabling Debug Mode

### Method 1: Console Helpers (Recommended)
When the extension is running, open browser dev tools and use the global debug helpers:

```javascript
// Enable debug mode with detailed logging
newNameDebug.enableDebug('detailed');

// Enable with verbose logging (shows full context tables)
newNameDebug.enableDebug('verbose');

// Enable with basic logging (minimal output)
newNameDebug.enableDebug('basic');

// Disable debug mode
newNameDebug.disableDebug();

// Check current debug settings
newNameDebug.getDebugSettings();

// Show help
newNameDebug.debugHelp();
```

### Method 2: Settings API
```javascript
import { updateSettings } from '@/entrypoints/shared/settings/settings';

// Enable debug mode
await updateSettings({
  debug: {
    enabled: true,
    level: 'detailed'
  }
});
```

## Debug Levels

- **`basic`**: Minimal logging - shows final decisions only
- **`detailed`**: Moderate logging - includes candidate evaluation and policy decisions
- **`verbose`**: Full logging - complete context with tables and breakdowns

## What Gets Logged

### Phase 1 Processing
- **Input signals**: URL, filename, MIME type, page context
- **Candidate evaluation**: All candidates with scores and reasoning
- **Selected candidate**: Best candidate with score breakdown
- **Policy application**: Token processing, length calculations
- **Final decision**: Whether to rename and reasoning

### Debug Context
Each rename operation gets a unique debug ID and tracks:
- Processing time
- All intermediate results
- Decision reasoning
- File type detection
- Qualifier analysis

## Viewing Debug Data

### Console Output
Debug information is logged to browser console with structured output:

```
[NewName Debug] debug_1234567890_abc123: {
  original: "document.pdf",
  final: "Contract Analysis Report - 2025-01-15.pdf",
  renamed: true,
  reason: "file type enabled",
  time: "23ms"
}
```

### Programmatic Access
```javascript
// Get all debug contexts (most recent first)
const contexts = newNameDebug.getDebugContexts();

// Get latest debug session
const latest = newNameDebug.getLatestDebugContext();

// Export debug data as JSON file
newNameDebug.exportDebugData();
```

## Debug Data Structure

Each debug context contains:
- **downloadId**: Unique identifier
- **timestamp**: Processing start time
- **signals**: Input data (URL, filename, page context)
- **heuristicResult**: Candidate analysis and selection
- **policyResult**: Filename policy application
- **finalOutcome**: Generated filename and metadata
- **processingTime**: Total execution time
- **decision**: Rename decision and reasoning

## Performance Impact

- **Disabled**: Zero performance overhead
- **Basic**: Minimal impact (~1-2ms)
- **Detailed/Verbose**: Small impact (~5-10ms) due to additional data collection

Debug mode automatically limits stored contexts to the 10 most recent to prevent memory issues.

## Troubleshooting Common Issues

### Why wasn't my file renamed?
1. Enable debug mode: `newNameDebug.enableDebug('verbose')`
2. Trigger a download
3. Check console for decision reasoning
4. Look for "file type disabled" or low candidate scores

### Why did it choose this name?
1. Look at "Candidate Evaluation" table in verbose output
2. Check scores for Link, Heading, Title, URL, Filename sources
3. Review "Selected Candidate" reasoning

### Token processing issues?
1. Check "Policy Application" section
2. Review subject/qualifier token processing
3. Verify length calculations and separator handling

## Integration with Tests

Debug functionality includes comprehensive tests:
```bash
bun run test entrypoints/shared/debug/logger.test.ts
```

The debug system is designed to be completely isolated from production code when disabled, ensuring no performance impact on normal operation.