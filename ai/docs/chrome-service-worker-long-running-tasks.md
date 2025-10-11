# Chrome Service Worker: Long-Running Tasks & Delayed Operations

**Author:** Development Session
**Date:** 2025-10-11
**Status:** Reference Implementation
**Related:** Post-Download Rename, File System Access API

---

## Overview

Chrome extension service workers are **ephemeral** and terminate after ~30 seconds of inactivity. This guide documents patterns for implementing long-running or delayed operations that survive service worker termination.

**Key Principle:** Never use `setTimeout`/`setInterval` for delays >30 seconds or critical operations.

---

## Problem: `setTimeout` Doesn't Work

### Why It Fails

```typescript
// ❌ BROKEN: Service worker terminates before this runs
await helpers.emitStatus('applied');
await new Promise(resolve => setTimeout(resolve, 5000));
// Service worker dies here → rename never happens
await renameFile(path, newName);
```

**What happens:**
1. User action completes → No more events
2. Service worker goes idle
3. Chrome terminates worker after ~30s
4. `setTimeout` callback is **cancelled**
5. Your code never runs

### Service Worker Lifecycle Rules

- **Terminates:** After 30 seconds of no events or API calls
- **Single request timeout:** 5 minutes maximum
- **Timer cancellation:** All pending `setTimeout`/`setInterval` cancelled on termination

Source: [Chrome Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)

---

## Solution: Use `chrome.alarms` API

### Why Alarms Work

- ✅ **Persist across service worker restarts**
- ✅ **Wake up terminated workers** when alarm fires
- ✅ **Survive browser restarts** (until alarm fires)
- ✅ **Designed for scheduled tasks**

### Implementation Pattern

#### 1. Add Permission to Manifest

```typescript
// wxt.config.ts
export default defineConfig({
  manifest: {
    permissions: ['alarms', 'downloads', 'storage'],
    // ...
  },
});
```

#### 2. Schedule the Alarm

```typescript
import { browser } from 'wxt/browser';

async function scheduleDelayedRename(
  historyId: string,
  currentPath: string,
  targetName: string,
): Promise<void> {
  // Store state in persistent storage (history, local storage, etc.)
  await updateHistoryItem(historyId, (item) => ({
    ...item,
    pendingOperation: {
      currentPath,
      targetName,
      scheduledAt: Date.now(),
    },
  }));

  // Schedule alarm (persists across restarts)
  const alarmName = `delayed-rename-${historyId}`;
  await browser.alarms.create(alarmName, {
    delayInMinutes: 5 / 60, // 5 seconds in minutes (minimum: 1 minute in production)
  });

  console.log('[Scheduler] Alarm created', alarmName);
}
```

#### 3. Handle Alarm Events

```typescript
// entrypoints/background.ts

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('delayed-rename-')) {
    const historyId = alarm.name.replace('delayed-rename-', '');

    console.log('[Alarms] Alarm fired', historyId);

    try {
      // Dynamically import handler (avoids circular deps)
      const { executeDelayedRename } = await import('./background/rename-handler');
      await executeDelayedRename(historyId);
    } catch (error) {
      console.error('[Alarms] Operation failed', error);
    }
  }
});
```

#### 4. Execute Operation

```typescript
// entrypoints/background/rename-handler.ts

export async function executeDelayedRename(historyId: string): Promise<void> {
  // Retrieve stored state from history
  const item = await getHistoryItem(historyId);
  if (!item?.pendingOperation) {
    console.warn('[Handler] No pending operation found', historyId);
    return;
  }

  const { currentPath, targetName } = item.pendingOperation;

  // Perform operation (e.g., file rename)
  const result = await renameFile({
    relativePath: currentPath,
    newFilename: targetName,
    rootHandle: await getStoredDirectoryHandle(),
  });

  // Update history and clear pending state
  await updateHistoryItem(historyId, (item) => ({
    ...item,
    final: result.finalName,
    pendingOperation: undefined, // Clear pending state
  }));

  console.log('[Handler] Operation complete', result.finalName);
}
```

---

## Real-World Example: PDF Analysis Rename

### Use Case

After instant baseline renames a PDF, schedule a delayed rename to append `-test` suffix (simulating background analysis that takes 5 seconds).

### Implementation

**Schedule in download flow:**
```typescript
// entrypoints/background/download-coordinator.ts

if (evaluation.fileType === 'pdf' && renameCandidate) {
  void import('./rename-orchestrator').then(({ schedulePdfAnalysisForDownload }) => {
    void schedulePdfAnalysisForDownload({
      historyId,
      currentPath: renameRelativePath,
      currentFilename: finalFilename,
      fileType: evaluation.fileType,
    });
  });
}
```

**Core scheduling logic:**
```typescript
// entrypoints/background/rename-orchestrator.ts

const PDF_ANALYSIS_DELAY_MS = 5_000;
const PDF_ANALYSIS_DELAY_MINUTES = PDF_ANALYSIS_DELAY_MS / 60_000;

async function scheduleAnalysisAlarm(
  historyId: string,
  currentPath: string,
  currentName: string,
  fileType: string,
): Promise<void> {
  if (fileType !== 'pdf') return;

  const targetName = appendTestSuffix(currentName);

  // Store state
  await updateHistoryItem(historyId, (item) => ({
    ...item,
    pendingAnalysisRename: {
      currentPath,
      currentName,
      targetName,
      scheduledAt: Date.now(),
    },
  }));

  // Schedule alarm
  await browser.alarms.create(`pdf-analysis-${historyId}`, {
    delayInMinutes: PDF_ANALYSIS_DELAY_MINUTES,
  });
}
```

**Alarm handler:**
```typescript
// entrypoints/background.ts

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('pdf-analysis-')) {
    const historyId = alarm.name.replace('pdf-analysis-', '');
    const { executePdfAnalysisRename } = await import('./background/rename-orchestrator');
    await executePdfAnalysisRename(historyId);
  }
});
```

**Execution:**
```typescript
// entrypoints/background/rename-orchestrator.ts

export async function executePdfAnalysisRename(historyId: string): Promise<void> {
  const item = await getHistoryItem(historyId);
  if (!item?.pendingAnalysisRename) return;

  const { currentPath, targetName } = item.pendingAnalysisRename;
  const handle = await getStoredDirectoryHandle();

  const result = await renameFile({
    relativePath: currentPath,
    newFilename: targetName,
    rootHandle: handle,
  });

  await updateHistoryItem(historyId, (item) => ({
    ...item,
    final: result.finalName,
    path: result.finalPath,
    pendingAnalysisRename: undefined,
  }));
}
```

### Timeline Example

```
16:02:36.868  Instant baseline rename
              historia_transakcji_XXX.pdf → historia_transakcji_XXX_2025-10-11.pdf

16:02:36.898  Alarm scheduled (5 seconds)

16:02:41.920  Alarm fires (5.013s later)
              Service worker wakes up

16:02:41.932  Second rename executes
              historia_transakcji_XXX_2025-10-11.pdf → ..._2025-10-11-test.pdf
```

---

## Alternative Approaches

### Option 1: Offscreen Documents (Complex, for >5 minutes)

Use offscreen documents for long-running DOM operations:

```typescript
// Create offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['BLOBS'],
  justification: 'Process large file analysis',
});

// Send keepalive messages every 20s
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'keepalive' });
}, 20_000);
```

**When to use:**
- Tasks requiring DOM APIs (Blob, FileReader, etc.)
- Operations >5 minutes
- Heavy processing in isolated context

**Tradeoffs:**
- More complex setup
- Higher memory usage
- Requires messaging protocol

### Option 2: Native Messaging (Advanced)

Connect to native host to keep worker alive:

```typescript
const port = chrome.runtime.connectNative('com.example.host');
// Connection keeps service worker alive
```

**When to use:**
- Need OS-level integration
- Long-running background daemon
- Multiple extensions sharing state

### Option 3: WebSocket Connections (Chrome 116+)

Active WebSocket extends worker lifetime:

```typescript
const ws = new WebSocket('wss://example.com');
ws.onmessage = (msg) => {
  // Resets service worker idle timer
};
```

**When to use:**
- Real-time sync required
- Server-sent updates needed
- Already have WebSocket infrastructure

---

## Best Practices

### 1. State Persistence

Always store operation context in persistent storage:

```typescript
// ✅ Good: Store state before scheduling
await updateHistoryItem(id, (item) => ({
  ...item,
  pendingOperation: { path, target, timestamp },
}));
await browser.alarms.create(name, { delayInMinutes });

// ❌ Bad: Keep state in memory
let pendingOps = new Map(); // Lost on worker termination
```

### 2. Cleanup

Always clear pending state after execution:

```typescript
// ✅ Good: Clear even on failure
try {
  await performOperation();
} finally {
  await updateHistoryItem(id, (item) => ({
    ...item,
    pendingOperation: undefined,
  }));
}
```

### 3. Error Handling

Handle permission/state loss gracefully:

```typescript
export async function executeDelayedOperation(id: string): Promise<void> {
  const item = await getHistoryItem(id);

  // Validate state exists
  if (!item?.pendingOperation) {
    console.warn('[Handler] No pending operation', id);
    return;
  }

  // Validate permissions
  const handle = await getStoredDirectoryHandle();
  if (!handle || !(await isHandleValid(handle))) {
    console.error('[Handler] Invalid permissions', id);
    // Clear pending state since we can't complete
    await updateHistoryItem(id, (item) => ({
      ...item,
      pendingOperation: undefined,
    }));
    return;
  }

  // Execute operation...
}
```

### 4. Alarm Precision

Chrome alarms have minimum intervals:

```typescript
// Development: Can use seconds via minutes fraction
delayInMinutes: 5 / 60  // 5 seconds (works in dev mode)

// Production: Minimum 1 minute
delayInMinutes: 1  // Production minimum

// Periodic: Minimum 1 minute
periodInMinutes: 1  // For recurring tasks
```

**Note:** Short delays (<1 minute) work in dev mode but may be clamped in production.

### 5. Testing Worker Termination

Manually verify your implementation survives termination:

**Test 1: Force stop service worker**
1. Download file to trigger operation
2. Open DevTools → Application → Service Workers
3. Click "Stop" to force-terminate
4. Wait for alarm delay
5. Verify operation completes when alarm fires

**Test 2: Browser restart**
1. Schedule operation with 30+ second delay
2. Close browser entirely before delay elapses
3. Reopen browser
4. Verify alarm fires and operation completes

---

## Common Pitfalls

### ❌ Pitfall 1: Missing Permission

```typescript
// Error: chrome.alarms is undefined
await browser.alarms.create(name, { delayInMinutes: 1 });
```

**Fix:** Add `alarms` to manifest permissions.

### ❌ Pitfall 2: State Not Persisted

```typescript
// Lost on worker termination
let pendingRenames = new Map();
await browser.alarms.create('rename', { delayInMinutes: 1 });
```

**Fix:** Store state in `chrome.storage.local` or IndexedDB.

### ❌ Pitfall 3: Blocking on Promises

```typescript
// ❌ Promise lost if worker terminates
setTimeout(async () => {
  await renameFile(path, name);
}, 5000);
```

**Fix:** Use alarms; retrieve state from storage in handler.

### ❌ Pitfall 4: Not Clearing Alarms

```typescript
// Alarm fires even if operation cancelled
await browser.alarms.create('op', { delayInMinutes: 5 });
// User cancels operation
// Alarm still fires 5 minutes later
```

**Fix:** Clear alarms when operation cancelled:
```typescript
await browser.alarms.clear('op');
```

---

## Performance Considerations

### Memory

- **Alarms:** Minimal overhead (~few bytes per alarm)
- **State storage:** Use efficient serialization (avoid large objects)
- **Worker restarts:** ~50-100ms cold start

### Timing Precision

- **Alarm accuracy:** ±1-5 seconds typical
- **Not suitable for:** Real-time sync, precise animations
- **Good for:** Background tasks, delayed operations, scheduled jobs

### Debugging

Check active alarms:
```javascript
// In service worker DevTools console
chrome.alarms.getAll().then(console.table);

// Output:
// ┌────────────────────────────────┬──────────────────┐
// │ name                           │ scheduledTime    │
// ├────────────────────────────────┼──────────────────┤
// │ pdf-analysis-4d011219-156f...  │ 1760191361898    │
// └────────────────────────────────┴──────────────────┘
```

Monitor alarm events:
```javascript
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('🔔 Alarm fired:', alarm.name, new Date(alarm.scheduledTime));
});
```

---

## Migration Checklist

When converting `setTimeout` to alarms:

- [ ] Add `alarms` permission to manifest
- [ ] Identify all `setTimeout` calls >30 seconds
- [ ] Store operation context in persistent storage
- [ ] Create alarm with unique name
- [ ] Add `browser.alarms.onAlarm` listener
- [ ] Implement handler that retrieves state from storage
- [ ] Clear pending state after execution
- [ ] Test with forced worker termination
- [ ] Test with browser restart
- [ ] Update error handling for permission loss

---

## References

### Chrome Documentation
- [Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [chrome.alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms)
- [Longer Service Worker Lifetimes](https://developer.chrome.com/blog/longer-esw-lifetimes/)

### Related Implementation
- `entrypoints/background/rename-orchestrator.ts` — PDF analysis scheduling
- `entrypoints/background.ts` — Alarm listener registration
- `entrypoints/shared/history/history.ts` — Pending state persistence
- `wxt.config.ts` — Manifest permissions

---

## Summary

**Key Takeaways:**

1. ✅ Use `chrome.alarms` for delayed/scheduled operations
2. ✅ Store operation state in persistent storage
3. ✅ Clean up state after completion
4. ✅ Handle permission loss gracefully
5. ❌ Never rely on `setTimeout` for critical operations

**When to use each approach:**

| Use Case | Recommended API |
|----------|----------------|
| Delayed operation (5s - 5min) | `chrome.alarms` |
| Recurring task (every 1+ minute) | `chrome.alarms` with `periodInMinutes` |
| Long processing (>5 min) | Offscreen document |
| Real-time sync | WebSocket connection |
| OS integration | Native messaging |

Your delayed operations will now survive service worker termination, browser restarts, and system sleep. 🎯
