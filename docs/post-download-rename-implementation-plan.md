# Post-Download File Rename Implementation Plan

**Author:** Research & Planning Session
**Date:** 2025-10-10
**Status:** RFC / Implementation Ready (Corrected)
**Related:** PRD-technical-perspective.md, PRD-business-perspective.md, phase-2-implementation-epics.md

---

## ⚠️ Corrections Applied (Critical Fixes)

This plan has been updated with the following critical corrections based on technical review:

1. **✅ IndexedDB for handle storage** — Use `idb-keyval` for `FileSystemDirectoryHandle` persistence; WXT storage for settings (hybrid strategy)
2. **✅ Permissions DO persist (Chrome 122+)** — Users can grant "Allow on every visit"; handles restore automatically via `requestPermission()`
3. **✅ Offscreen lifecycle check** — Use `chrome.runtime.getContexts()` instead of non-existent `chrome.offscreen.hasDocument?.()`
4. **✅ Nested path support** — Added `getParentAndLeaf()` to walk directory trees; handles files in subfolders correctly
5. **✅ Streaming for large files** — Use `file.stream().pipeTo(writable)` for files > 10MB to minimize memory usage
6. **✅ Broader error handling** — Retry on `NotAllowedError`, `InvalidModificationError`, not just `NoModificationAllowedError`
7. **✅ Windows reserved names** — Sanitize `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9` before creating file handles
8. **✅ .crswap orphan prevention** — Always `close()` writable streams in `finally` blocks to prevent temp file leaks
9. **✅ Relative path storage** — Store relative paths (vs. absolute) in history for portable rename operations

All code examples below reflect these corrections.

---

## Executive Summary

This document outlines the implementation strategy for post-download file renaming using the File System Access API. The core challenge is that Chrome 138 does **not** support `FileSystemHandle.move()` for regular files (only OPFS). Outside OPFS, `move()` is **behind the Experimental Web Platform features flag**; directory moves are **not implemented** yet. This requires a **copy+delete workaround** until the API ships broadly.

**Key Insights:**
- File System Access API is the correct approach (aligns with PRD §6)
- `move()` is behind experimental flag for non-OPFS files in Chrome 138
- Copy+delete workaround is viable and maintains all functionality
- One-time Downloads folder permission enables Upgrade/Undo flows (permissions **persist** since Chrome 122)
- Handles must be stored in **IndexedDB**, not chrome.storage.local (offscreen compatibility)
- Current toast infrastructure is ready, actions just need wiring

---

## Research Findings

### Chrome API Capabilities (as of Chrome 138)

#### File System Access API Status

**`FileSystemHandle.move()` Availability:**
- ✅ **Shipped** for files within Origin Private File System (OPFS)
- ⚠️ **Behind flag** for files outside OPFS (`chrome://flags/#enable-experimental-web-platform-features`)
- ❌ **Not yet supported** for directories
- 📝 **Migration:** When `move()` ships broadly, feature-detect and use native API; fallback remains for compatibility

**Workaround:**
```typescript
// Current approach: copy + delete
async function renameFile(dirHandle: FileSystemDirectoryHandle, oldName: string, newName: string) {
  const oldHandle = await dirHandle.getFileHandle(oldName);
  const file = await oldHandle.getFile();
  const newHandle = await dirHandle.getFileHandle(newName, { create: true });
  const writable = await newHandle.createWritable();
  await writable.write(file);
  await writable.close();
  await dirHandle.removeEntry(oldName);
}
```

**Future Migration:**
When `move()` ships, feature-detect and upgrade:
```typescript
if ('move' in FileSystemHandle.prototype) {
  await oldHandle.move(newName);
} else {
  // Fallback to copy+delete
}
```

#### Directory Handle Persistence

**Hybrid Storage Strategy:**

Use **WXT storage** (`chrome.storage.local`) for:
- User preferences (mode, strategy, toggles)
- Settings, counters, telemetry flags
- Anything that might want sync across devices

Use **IndexedDB** (via `idb-keyval`) for:
- `FileSystemDirectoryHandle` (Downloads folder)
- Future `FileSystemFileHandle` references
- Large/local logs

**Why IndexedDB for handles:**
- File system handles **must** be stored in IndexedDB (platform requirement)
- Works correctly in offscreen documents (no extension API restrictions)
- On Chrome 122+, users can grant **persistent permissions** ("Allow on every visit")
- On startup, load handles from IndexedDB and call `requestPermission()` to restore access

**Permission Model:**
```typescript
import { storeDirectoryHandle, getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';

// Request once during onboarding (in popup or options page)
const dirHandle = await window.showDirectoryPicker({
  startIn: 'downloads',
  mode: 'readwrite'
});

// Store handle in IndexedDB via idb-keyval
await storeDirectoryHandle(dirHandle);

// Later (e.g., on extension startup), restore and verify permissions
const dirHandle = await getStoredDirectoryHandle();
if (!dirHandle) {
  // No handle stored, show onboarding
  return;
}

if ((await dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
  const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
  if (permission !== 'granted') {
    // Permission lost, show re-onboarding flow
    throw new Error('Permission denied');
  }
}
```

**Key Benefits:**
- **Simple API:** `idb-keyval` reduces boilerplate vs. raw IndexedDB
- **Persistent permissions (Chrome 122+):** Users grant "Allow on every visit" → auto-restore on browser restart
- **Offscreen compatible:** IndexedDB works everywhere; `chrome.storage` doesn't in offscreen documents
- **Hybrid strategy:** Settings in WXT storage, handles in IndexedDB

#### Chrome Downloads API Integration

**File Path Access:**
- `chrome.downloads.search()` returns `DownloadItem` with `filename` property
- `filename` is an **absolute local path** (e.g., `/Users/ward/Downloads/file.pdf`)
- `DownloadOptions.filename` is **relative to the Downloads directory** when initiating downloads
- `onChanged` event fires when download state changes to `complete`

**Key Pattern:**
```typescript
browser.downloads.onChanged.addListener(async (delta) => {
  if (delta.state?.current === 'complete') {
    const [item] = await browser.downloads.search({ id: delta.id });
    // item.filename = absolute path on disk
    // Parse relative path: subtract Downloads root from absolute path
    // Store relative path in history for Phase 2 renames
    // Start background analysis here
  }
});
```

#### Managed Downloads Subfolder & Pre-Routing

- **Chrome restriction:** File System Access rejects the root of well-known folders (e.g., `Downloads`). Requesting it triggers `DOMException: SecurityError`; subfolders like `Downloads/NewName` are allowed.
- **Onboarding UX:** When a `SecurityError` occurs, surface guidance (“Create or select Downloads/NewName”) and re-open the picker with `startIn: 'downloads'` so users can create/select the managed directory.
- **Handle metadata:** Persist the granted directory handle **and** a sanitized relative path (defaulting to `handle.name`) in IndexedDB. Background contexts reuse this metadata to build suggestions and restore permissions after restart.
- **Download routing:** Inside `onDeterminingFilename`, prefix every suggestion with the managed path so Chrome writes directly into the granted folder. For example:
  ```typescript
  suggest({ filename: `${managedPrefix}/${relativePath}` });
  ```
  Even “keep original” flows route into the subfolder, so upgrade/undo always operate within the granted scope.
- **Confirm toast payload:** Carry both the relative path (for rename operations) and the display path (managed prefix + relative path) through toast proposals so the UI shows the real location without leaking absolute system paths.
- **History entries:** Store paths relative to the managed folder (`Report.pdf`, `project/video.mp4`). Compose the display path on demand, which keeps history oblivious to future folder migrations.

**Offscreen Document Lifecycle:**
```typescript
/**
 * Check if offscreen document exists using chrome.runtime.getContexts
 * (chrome.offscreen.hasDocument is not a valid API)
 */
async function ensureOffscreen() {
  const url = chrome.runtime.getURL('offscreen/index.html');

  // Use getContexts to check for existing offscreen document
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [url],
  });

  if (existingContexts.length > 0) {
    return; // Already exists
  }

  // Create offscreen document
  await chrome.offscreen.createDocument({
    url,
    reasons: ['BLOBS', 'DOM_PARSER'],
    justification: 'Run built-in AI + PDF/media analysis for Contextual Upgrade processing',
  });
}
```

### Security & Privacy Considerations

1. **User Activation Required:** `showDirectoryPicker()` requires user gesture (button click)
2. **Explicit Consent:** User must actively choose Downloads folder
3. **Scope Limited:** Extension only has access to the granted directory
4. **Persistent Permissions (Chrome 122+):** Users can grant "Allow on every visit"; restore via `requestPermission()`
5. **Transparent Operations:** All file operations are auditable in history

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interaction                          │
│  (Toast Actions: Apply, Keep, Always Apply, Undo)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Background Service Worker                     │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Confirm Toast    │  │ Rename           │  │ Upgrade       │ │
│  │ Controller       │─▶│ Orchestrator     │  │ Coordinator   │ │
│  │ (existing)       │  │ (NEW)            │  │ (NEW)         │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           │                     │                      │          │
│           │                     │                      │          │
│           ▼                     ▼                      ▼          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              File System Access Manager (NEW)                ││
│  │  • Directory handle storage & permission verification        ││
│  │  • Copy+delete rename operations                             ││
│  │  • Conflict resolution & retry logic                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Offscreen Document (analysis)                  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ PDF Analysis     │  │ Media Analysis   │  │ AI Integration│ │
│  │ (PDF.js/MuPDF)   │  │ (MediaInfo.js)   │  │ (Built-in AI) │ │
│  │                  │  │ (existing)       │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           │                     │                      │          │
│           └─────────────────────┴──────────────────────┘          │
│                              │                                     │
│                              ▼                                     │
│                    Upgrade Proposal Generator                     │
│                    (scoring, comparison)                          │
│                                                                   │
│  Note: Offscreen is safest context for file I/O operations       │
│  (full DOM, stable context, no extension-API limits beyond       │
│  chrome.runtime). Keep pickers in popup/options (user-visible).  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Toast Action → File Rename

```
1. User clicks "Apply" on toast
   ↓
2. Content script sends confirmToastDecision message to background
   ↓
3. ConfirmToastController.handleUserDecision(decision)
   ↓
4. RenameOrchestrator.executeRename(entry, decision)
   ↓
5. FileSystemManager.renameFile(relativePath, newName)
   ├─ Get directory handle from IndexedDB
   ├─ Verify permissions (re-request if needed)
   ├─ Walk to parent directory (handle nested paths)
   ├─ Sanitize Windows reserved names
   ├─ Execute copy+delete (or stream+delete for large files)
   ├─ Handle conflicts (suffix: " - 2", " - 3", etc.)
   └─ Always close() writable stream to avoid .crswap orphans
   ↓
6. Update history with final outcome
   ↓
7. Emit status to toast (success, error, timeout)
   ↓
8. Toast shows confirmation → auto-dismisses
```

### Data Flow: Background Analysis → Upgrade Toast

```
1. downloads.onChanged fires with state='complete'
   ↓
2. UpgradeCoordinator checks if file needs analysis
   ├─ History lookup (was it kept or low confidence?)
   ├─ Settings check (per-type upgrade enabled?)
   └─ Skip if already renamed with high confidence
   ↓
3. Send analysis request to Offscreen document
   ├─ Range fetch first N pages/bytes
   ├─ PDF: text extraction → Summarizer API
   ├─ Image: EXIF → OCR for screenshots
   ├─ Media: already analyzed in Phase 1 (use existing)
   └─ Generate upgrade proposal with reason tags
   ↓
4. Score upgrade vs. baseline
   ├─ Compare metadata richness
   ├─ Calculate confidence delta
   └─ Threshold check (e.g., +10 points)
   ↓
5. If upgrade score high enough:
   ├─ Store proposal in history.upgrade
   ├─ Queue confirm toast with upgrade flag
   └─ Show "Better name found" notification
   ↓
6. User clicks Apply → RenameOrchestrator executes rename
```

---

## Implementation Roadmap

### Phase 1: Wire Toast Actions (Foundation)

**Goal:** Make Apply/Keep/Always Apply buttons functional without background analysis

#### 1.1 File System Access Module

**Location:** `entrypoints/shared/filesystem/`

**Files to create:**

**`directory-picker.ts`**
```typescript
/**
 * Directory picker and permission management for File System Access API
 */

export interface DirectoryHandleWithPermission {
  handle: FileSystemDirectoryHandle;
  permission: PermissionState;
}

/**
 * Request Downloads directory access from user
 * Must be called from user gesture (button click)
 */
export async function requestDownloadsAccess(): Promise<FileSystemDirectoryHandle> {
  try {
    const handle = await window.showDirectoryPicker({
      startIn: 'downloads',
      mode: 'readwrite',
    });
    return handle;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('User cancelled directory picker');
    }
    throw error;
  }
}

/**
 * Verify and request permission for directory handle
 */
export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle
): Promise<PermissionState> {
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  if (permission === 'granted') {
    return 'granted';
  }

  // Try to request permission
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested;
}

/**
 * Check if handle is still valid and has permission
 */
export async function isHandleValid(
  handle: FileSystemDirectoryHandle | null
): Promise<boolean> {
  if (!handle) return false;

  try {
    const permission = await verifyDirectoryPermission(handle);
    return permission === 'granted';
  } catch {
    return false;
  }
}
```

**`handle-storage.ts`**
```typescript
/**
 * Persist and retrieve directory handles from IndexedDB using idb-keyval
 *
 * IMPORTANT: FileSystemDirectoryHandle objects are serializable and must be stored
 * in IndexedDB (not chrome.storage.local) to work properly in offscreen documents.
 *
 * Uses idb-keyval (https://github.com/jakearchibald/idb-keyval) for simple IndexedDB access.
 */
import { get, set, del, createStore } from 'idb-keyval';

// Custom store for file system handles (isolated from default store)
const fsStore = createStore('newname-filesystem', 'handles');

export interface StoredHandleInfo {
  handle: FileSystemDirectoryHandle;
  grantedAt: number;
  lastVerified: number;
}

const DOWNLOADS_KEY = 'downloads-handle';

/**
 * Store directory handle in IndexedDB
 */
export async function storeDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const info: StoredHandleInfo = {
    handle,
    grantedAt: Date.now(),
    lastVerified: Date.now(),
  };

  await set(DOWNLOADS_KEY, info, fsStore);
}

/**
 * Retrieve stored directory handle
 */
export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const info = await get<StoredHandleInfo>(DOWNLOADS_KEY, fsStore);
    return info?.handle ?? null;
  } catch (error) {
    console.error('[FileSystem] Failed to retrieve directory handle', error);
    return null;
  }
}

/**
 * Clear stored handle (e.g., when permission revoked)
 */
export async function clearStoredHandle(): Promise<void> {
  await del(DOWNLOADS_KEY, fsStore);
}

/**
 * Update last verified timestamp
 */
export async function updateLastVerified(): Promise<void> {
  const info = await get<StoredHandleInfo>(DOWNLOADS_KEY, fsStore);
  if (!info) return;

  info.lastVerified = Date.now();
  await set(DOWNLOADS_KEY, info, fsStore);
}

/**
 * Get handle metadata (without the handle itself)
 */
export async function getHandleMetadata(): Promise<Pick<StoredHandleInfo, 'grantedAt' | 'lastVerified'> | null> {
  const info = await get<StoredHandleInfo>(DOWNLOADS_KEY, fsStore);
  if (!info) return null;

  return {
    grantedAt: info.grantedAt,
    lastVerified: info.lastVerified,
  };
}
```

**`rename-operations.ts`**
```typescript
/**
 * Core file rename operations using File System Access API
 */
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { verifyDirectoryPermission } from './directory-picker';

export interface RenameOptions {
  relativePath: string;        // e.g., "subfolder/file.pdf" or "file.pdf"
  newFilename: string;
  rootHandle: FileSystemDirectoryHandle;
  maxRetries?: number;
  retryDelayMs?: number;
  streamThresholdBytes?: number; // Stream files larger than this (default 10MB)
}

export interface RenameResult {
  success: boolean;
  finalName: string;
  finalPath: string;
  error?: string;
  retriesUsed?: number;
  method?: 'copy-delete' | 'stream-delete';
}

// Windows reserved names that must be sanitized
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

// Large file threshold (10MB)
const DEFAULT_STREAM_THRESHOLD = 10 * 1024 * 1024;

/**
 * Sanitize filename for Windows reserved names
 */
function sanitizeWindowsBasename(name: string): string {
  const lastDotIndex = name.lastIndexOf('.');
  const basename = lastDotIndex > 0 ? name.slice(0, lastDotIndex) : name;
  const extension = lastDotIndex > 0 ? name.slice(lastDotIndex) : '';

  if (WINDOWS_RESERVED.test(basename)) {
    return `${basename}_${extension}`;
  }

  return name;
}

/**
 * Walk directory path and return parent handle + leaf filename
 * Handles nested paths like "subfolder/file.pdf"
 */
async function getParentAndLeaf(
  root: FileSystemDirectoryHandle,
  relativePath: string
): Promise<{ dir: FileSystemDirectoryHandle; leaf: string }> {
  const parts = relativePath.split('/').filter(Boolean);
  const leaf = parts.pop();

  if (!leaf) {
    throw new Error('Invalid path: empty leaf name');
  }

  let dir = root;
  for (const segment of parts) {
    dir = await dir.getDirectoryHandle(segment, { create: false });
  }

  return { dir, leaf };
}

/**
 * Rename file using copy+delete workaround
 * (Until FileSystemHandle.move() ships for non-OPFS files)
 *
 * Supports nested paths, streaming for large files, and Windows reserved names.
 */
export async function renameFile(options: RenameOptions): Promise<RenameResult> {
  const {
    relativePath,
    newFilename,
    rootHandle,
    maxRetries = 3,
    retryDelayMs = 1000,
    streamThresholdBytes = DEFAULT_STREAM_THRESHOLD,
  } = options;

  // Verify permission first
  const permission = await verifyDirectoryPermission(rootHandle);
  if (permission !== 'granted') {
    return {
      success: false,
      finalName: newFilename,
      finalPath: relativePath,
      error: 'Permission denied for Downloads directory',
    };
  }

  // Sanitize Windows reserved names
  const safeName = sanitizeWindowsBasename(newFilename);

  let retriesUsed = 0;
  let writable: FileSystemWritableFileStream | null = null;

  while (retriesUsed <= maxRetries) {
    try {
      // Parse path to get parent directory and old filename
      const { dir: parentDir, leaf: oldLeaf } = await getParentAndLeaf(rootHandle, relativePath);

      // Check if source file exists
      const oldHandle = await parentDir.getFileHandle(oldLeaf);
      const file = await oldHandle.getFile();

      // Handle conflicts by generating unique name
      const finalNewName = await resolveConflict(parentDir, safeName);

      // Create new file handle
      const newHandle = await parentDir.getFileHandle(finalNewName, { create: true });
      writable = await newHandle.createWritable();

      // Choose copy method based on file size
      const useStreaming = file.size > streamThresholdBytes;

      if (useStreaming) {
        // Stream large files to minimize memory usage
        await file.stream().pipeTo(writable);
        writable = null; // pipeTo closes the stream
      } else {
        // Small files: direct write
        await writable.write(file);
        await writable.close();
        writable = null;
      }

      // Delete old file only after successful copy
      await parentDir.removeEntry(oldLeaf);

      // Reconstruct final path
      const parentPath = relativePath.split('/').slice(0, -1).join('/');
      const finalPath = parentPath ? `${parentPath}/${finalNewName}` : finalNewName;

      debugLogger.log('[FileSystem] Rename successful', {
        old: relativePath,
        new: finalPath,
        retries: retriesUsed,
        method: useStreaming ? 'stream-delete' : 'copy-delete',
        fileSize: file.size,
      });

      return {
        success: true,
        finalName: finalNewName,
        finalPath,
        retriesUsed,
        method: useStreaming ? 'stream-delete' : 'copy-delete',
      };

    } catch (error) {
      // Always close writable stream in finally block to avoid .crswap orphans
      if (writable) {
        try {
          await writable.close();
        } catch {
          // Ignore close errors
        }
        writable = null;
      }

      retriesUsed++;

      // Handle retryable errors
      if (error instanceof DOMException) {
        const isRetryable =
          error.name === 'NoModificationAllowedError' ||
          error.name === 'NotAllowedError' ||
          error.name === 'InvalidModificationError';

        if (isRetryable && retriesUsed <= maxRetries) {
          debugLogger.warn(
            `[FileSystem] Retryable error (${error.name}), retry ${retriesUsed}/${maxRetries}`,
            relativePath
          );
          await new Promise(resolve => setTimeout(resolve, retryDelayMs * retriesUsed));
          continue;
        }
      }

      // Other errors or max retries reached
      return {
        success: false,
        finalName: newFilename,
        finalPath: relativePath,
        error: error instanceof Error ? error.message : String(error),
        retriesUsed,
      };
    } finally {
      // Ensure writable stream is always closed to prevent .crswap orphans
      if (writable) {
        try {
          await writable.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  }

  return {
    success: false,
    finalName: newFilename,
    finalPath: relativePath,
    error: 'Max retries exceeded',
    retriesUsed,
  };
}

/**
 * Resolve filename conflicts by appending suffix
 * Returns a unique name that doesn't exist in the directory
 */
async function resolveConflict(
  dirHandle: FileSystemDirectoryHandle,
  desiredName: string
): Promise<string> {
  // Check if desired name already exists
  try {
    await dirHandle.getFileHandle(desiredName);
    // File exists, need to generate unique name
  } catch {
    // File doesn't exist, can use desired name
    return desiredName;
  }

  // Parse basename and extension
  const lastDotIndex = desiredName.lastIndexOf('.');
  const basename = lastDotIndex > 0 ? desiredName.slice(0, lastDotIndex) : desiredName;
  const extension = lastDotIndex > 0 ? desiredName.slice(lastDotIndex) : '';

  // Try suffixes: " - 2", " - 3", etc.
  for (let suffix = 2; suffix <= 100; suffix++) {
    const candidate = `${basename} - ${suffix}${extension}`;
    try {
      await dirHandle.getFileHandle(candidate);
      // Exists, try next
    } catch {
      // Doesn't exist, use this
      return candidate;
    }
  }

  // Fallback: timestamp suffix
  return `${basename} - ${Date.now()}${extension}`;
}

/**
 * Feature detection for native move() support
 */
export function supportsNativeMove(): boolean {
  return 'move' in FileSystemHandle.prototype;
}

/**
 * Future: Use native move when available
 */
export async function renameFileNative(
  dirHandle: FileSystemDirectoryHandle,
  oldFilename: string,
  newFilename: string
): Promise<RenameResult> {
  if (!supportsNativeMove()) {
    throw new Error('Native move not supported');
  }

  try {
    const handle = await dirHandle.getFileHandle(oldFilename);
    // @ts-expect-error - move() not yet in TypeScript types
    await handle.move(newFilename);

    return {
      success: true,
      finalName: newFilename,
    };
  } catch (error) {
    return {
      success: false,
      finalName: oldFilename,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

**`types.ts`**
```typescript
/**
 * Shared types for file system operations
 */

export interface FileSystemState {
  hasPermission: boolean;
  handle: FileSystemDirectoryHandle | null;
  lastError?: string;
}

export interface RenameRequest {
  historyId: string;
  oldPath: string;
  newFilename: string;
  source: 'user-action' | 'auto-apply' | 'upgrade';
}

export interface RenameResponse {
  success: boolean;
  historyId: string;
  finalPath: string;
  error?: string;
}
```

#### 1.2 Rename Orchestrator

**Location:** `entrypoints/background/rename-orchestrator.ts`

```typescript
/**
 * Orchestrates file rename operations from toast actions
 */
import type { ConfirmToastEntry } from './toast/confirmation-controller';
import type { ConfirmToastDecisionMessage } from '@/entrypoints/shared/toast/types';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import { updateHistoryItem } from '@/entrypoints/shared/history/history';
import { getStoredDirectoryHandle } from '@/entrypoints/shared/filesystem/handle-storage';
import { isHandleValid } from '@/entrypoints/shared/filesystem/directory-picker';
import { renameFile } from '@/entrypoints/shared/filesystem/rename-operations';
import { updateSettings } from '@/entrypoints/shared/settings/settings';

export interface RenameOrchestratorHelpers {
  emitStatus(state: 'applied' | 'kept' | 'error' | 'permission-denied', message?: string): Promise<void>;
}

/**
 * Execute rename operation for "Apply" action
 */
export async function executeApply(
  entry: ConfirmToastEntry,
  decision: ConfirmToastDecisionMessage,
  helpers: RenameOrchestratorHelpers
): Promise<void> {
  debugLogger.log('[RenameOrchestrator] Execute Apply', entry.historyId);

  // Get directory handle
  const dirHandle = await getStoredDirectoryHandle();

  if (!dirHandle || !(await isHandleValid(dirHandle))) {
    debugLogger.warn('[RenameOrchestrator] No valid directory handle');
    await helpers.emitStatus('permission-denied', 'Downloads folder access required');
    return;
  }

  // Determine final filename
  const finalFilename = decision.editedFilename || entry.proposal.proposedFilename;

  // Parse old filename from path
  const oldFilename = entry.proposal.originalFilename;

  // Execute rename
  const result = await renameFile({
    oldFilename,
    newFilename: finalFilename,
    dirHandle,
  });

  if (!result.success) {
    debugLogger.error('[RenameOrchestrator] Rename failed', result.error);
    await helpers.emitStatus('error', result.error);
    return;
  }

  // Update history
  await updateHistoryItem(entry.historyId, (item) => ({
    ...item,
    final: result.finalName,
    phase: 'contextual-upgrade',
    upgrade: {
      proposedFilename: finalFilename,
      proposedPath: entry.proposal.proposedPath,
      confidence: 'high',
      reasonTags: entry.proposal.reasonTags,
      generatedAt: Date.now(),
    },
  }));

  debugLogger.log('[RenameOrchestrator] Apply complete', result.finalName);
  await helpers.emitStatus('applied');
}

/**
 * Execute "Keep original" action
 */
export async function executeKeep(
  entry: ConfirmToastEntry,
  helpers: RenameOrchestratorHelpers
): Promise<void> {
  debugLogger.log('[RenameOrchestrator] Execute Keep', entry.historyId);

  // Update history to mark as kept
  await updateHistoryItem(entry.historyId, (item) => ({
    ...item,
    final: item.original, // Keep original name
    phase: 'instant-baseline',
  }));

  await helpers.emitStatus('kept');
}

/**
 * Execute "Always apply" action
 */
export async function executeAlwaysApply(
  entry: ConfirmToastEntry,
  decision: ConfirmToastDecisionMessage,
  helpers: RenameOrchestratorHelpers
): Promise<void> {
  debugLogger.log('[RenameOrchestrator] Execute Always Apply', entry.historyId);

  // Update per-type settings to auto-apply
  await updateSettings({
    perType: {
      [entry.proposal.fileType]: {
        behavior: 'auto',
      },
    },
  });

  // Then execute the rename
  await executeApply(entry, decision, helpers);
}
```

#### 1.3 Wire Actions in background.ts

**Update:** `entrypoints/background.ts`

```typescript
// In initializeBackground(), update ConfirmToastController hooks:

const confirmToastController = createConfirmToastController({
  async onUserDecision(entry, decision, helpers) {
    debugLogger.log('[ConfirmToast] Received user decision', decision.action, entry.proposal.historyId);

    const orchestratorHelpers = {
      emitStatus: helpers.emitStatus,
    };

    switch (decision.action) {
      case 'approve':
        await executeApply(entry, decision, orchestratorHelpers);
        break;

      case 'keep-original':
        await executeKeep(entry, orchestratorHelpers);
        break;

      case 'always-apply':
        await executeAlwaysApply(entry, decision, orchestratorHelpers);
        break;

      default:
        debugLogger.warn('[ConfirmToast] Unknown action', decision.action);
        await helpers.emitStatus('dismissed');
    }
  },

  async onAutoApply(entry, helpers) {
    debugLogger.log('[ConfirmToast] Auto-apply timeout reached', entry.proposal.historyId);

    // Execute rename automatically
    await executeApply(entry, {
      toastId: entry.proposal.toastId,
      historyId: entry.historyId,
      downloadId: entry.proposal.downloadId,
      action: 'approve',
    }, {
      emitStatus: helpers.emitStatus,
    });
  },
});
```

#### 1.4 Onboarding Flow

**Location:** `entrypoints/popup/onboarding/` (new)

**Files:**
- `DownloadsAccessScreen.tsx` - UI for requesting Downloads folder access
- `onboarding-flow.tsx` - Multi-step onboarding container
- `onboarding-state.ts` - Track onboarding completion

**Key UX:**
- Show during first run
- Clear explanation: "Allow NewName to rename files in your Downloads folder"
- "Skip" option (Upgrade/Undo disabled, show in-app messaging)
- Re-request flow if permission lost

---

### Phase 2: Background Analysis & Upgrade Pipeline

**Goal:** Analyze downloaded files in background, generate upgrade proposals

#### 2.1 Upgrade Coordinator

**Location:** `entrypoints/background/upgrade-coordinator.ts`

**Responsibilities:**
- Listen to `downloads.onChanged` for completed downloads
- Check if file needs analysis (settings, history confidence)
- Coordinate with offscreen document for analysis
- Score upgrade proposals vs. baseline
- Queue upgrade toasts when threshold met

**Key Logic:**
```typescript
browser.downloads.onChanged.addListener(async (delta) => {
  if (delta.state?.current !== 'complete') return;

  // Get download info and history
  const [item] = await browser.downloads.search({ id: delta.id });
  const historyItem = await getHistoryItemByDownloadId(delta.id);

  if (!historyItem) return;

  // Check if upgrade needed
  if (!shouldAnalyze(historyItem)) return;

  // Request analysis from offscreen
  const proposal = await requestUpgradeAnalysis({
    url: item.url,
    filename: item.filename,
    fileType: historyItem.fileType,
    baseline: historyItem.decision,
  });

  // Score upgrade
  const score = scoreUpgrade(proposal, historyItem);

  if (score.delta >= UPGRADE_THRESHOLD) {
    // Queue upgrade toast
    await confirmToastController.queueConfirmation({
      historyId: historyItem.id,
      originalFilename: historyItem.final, // Current name
      proposedFilename: proposal.name,
      // ... other fields
    });
  }
});
```

#### 2.2 Offscreen Analysis Pipeline

**Extend:** `entrypoints/offscreen/main.ts`

**Add handlers for:**
- PDF analysis (PDF.js text extraction)
- Image analysis (EXIF, OCR for screenshots)
- Media analysis (already exists via MediaInfo.js)
- AI integration (Chrome Built-in Prompt/Summarizer APIs)

**Analysis Flow:**
1. Range fetch first N pages/bytes
2. Extract text/metadata
3. Send to AI model (Summarizer for headlines, Language Detector)
4. Generate structured proposal with reason tags
5. Return to background coordinator

#### 2.3 Range Fetch Strategy

**Location:** `entrypoints/shared/integrations/range-fetcher.ts`

**Responsibilities:**
- Partial content fetching (HTTP Range header)
- Fallback to bounded full fetch
- Size guards and timeouts per PRD §5.3

---

### Phase 3: Optimization & Polish

#### 3.1 Feature Detection & Migration

**Detect native `move()` support:**
```typescript
export function detectFileSystemFeatures() {
  return {
    nativeMove: 'move' in FileSystemHandle.prototype,
    // Future: other features
  };
}
```

**Performance optimization:**
- Use native `move()` when available
- Fall back to copy+delete for compatibility

#### 3.2 Error Handling & Recovery

**Scenarios:**
1. **Busy file** → Retry queue with exponential backoff (3 attempts, PRD §6.2)
2. **Permission denied** → Re-request or disable Upgrade, show in-app message
3. **Conflicts** → Generate safe name with suffix (" - 2", " - 3")
4. **Network errors** (range fetch) → Fallback to bounded full fetch or skip
5. **Timeout** → Keep Instant Baseline name, surface notification

#### 3.3 History & Undo Integration

**Update history schema:**
```typescript
interface HistoryItem {
  // ... existing fields

  // Track post-download rename
  postDownloadRename?: {
    executedAt: number;
    method: 'copy-delete' | 'native-move';
    retriesUsed: number;
  };

  // Track upgrade proposal
  upgrade?: UpgradeProposal;
}
```

**Undo flow:**
```typescript
async function undoRename(historyId: string) {
  const item = await getHistoryItem(historyId);
  if (!item) throw new Error('History item not found');

  const dirHandle = await getStoredDirectoryHandle();
  if (!dirHandle) throw new Error('No directory access');

  // Rename back to original
  await renameFile({
    oldFilename: item.final,
    newFilename: item.original,
    dirHandle,
  });

  // Update history
  await updateHistoryItem(historyId, (item) => ({
    ...item,
    undone: true,
  }));
}
```

---

## Testing Strategy

### Unit Tests

**File System Module:**
- Mock `FileSystemDirectoryHandle` using WXT test utilities
- Test conflict resolution logic
- Test permission verification flows
- Test copy+delete operation edge cases

**Rename Orchestrator:**
- Mock toast entries and decision messages
- Verify correct action routing (Apply/Keep/Always)
- Test history updates
- Test error handling paths

### Integration Tests

**End-to-End Toast Flow:**
1. Queue confirm toast
2. User clicks Apply
3. Rename executes
4. History updates
5. Status emits to toast
6. Toast dismisses

**Background Analysis Pipeline:**
1. Download completes
2. Analysis triggered
3. Offscreen processes file
4. Upgrade proposal generated
5. Toast queued (if threshold met)

### Manual Testing Checklist

- [ ] Onboarding flow (first run)
- [ ] Permission request (Downloads folder picker)
- [ ] Apply action renames file on disk
- [ ] Keep action preserves original name
- [ ] Always Apply updates settings + renames
- [ ] Conflict resolution (duplicate names)
- [ ] Retry logic (busy file scenario)
- [ ] Permission re-request (after browser restart)
- [ ] Undo operation
- [ ] Background analysis after download
- [ ] Upgrade toast appears when better name found

---

## Migration Path

### Chrome 138 → Future (when `move()` ships)

**Step 1: Feature Detection**
```typescript
const features = detectFileSystemFeatures();
if (features.nativeMove) {
  // Use fast path
  await renameFileNative(dirHandle, oldName, newName);
} else {
  // Use copy+delete fallback
  await renameFile({ oldFilename: oldName, newFilename: newName, dirHandle });
}
```

**Step 2: Metrics & Monitoring**
- Track usage of native vs. fallback
- Monitor performance improvements
- Gradual rollout to verify stability

**Step 3: Cleanup**
- Remove copy+delete code after native `move()` is stable
- Update documentation

---

## Performance Considerations

### Copy+Delete Tradeoffs

**Pros:**
- ✅ Works today without experimental flags
- ✅ Identical API to future `move()`
- ✅ Easy migration path

**Cons:**
- ❌ Slower for large files (must copy entire file)
- ❌ Temporary 2x disk space requirement
- ❌ More I/O operations (read + write + delete)

**Mitigations:**
1. **Size guards:** Skip analysis/upgrade for files > 100MB (configurable)
2. **Background processing:** All operations in service worker (non-blocking)
3. **User feedback:** Show progress for large files
4. **Future optimization:** Automatically use native `move()` when available

### Memory & I/O

**Streaming approach for large files:**
```typescript
// Preferred: Use pipeTo() for files > 10MB (auto-handles backpressure)
await file.stream().pipeTo(writable);
// pipeTo() closes the stream automatically on success

// Manual streaming (if pipeTo not suitable):
const stream = await file.stream();
const writer = await writable.getWriter();

try {
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await writer.write(value);
  }
  await writer.close();
} catch (error) {
  await writer.abort();
  throw error;
}
```

**Temporary Disk Usage:**
Copy+delete temporarily doubles disk usage during the operation. The `close()` call commits the write; always call `close()` in a `finally` block to avoid orphan `.crswap` temporary files.

---

## Open Questions & Decisions

### 1. Onboarding Timing

**Options:**
- A. Request Downloads access during first-run onboarding (recommended)
- B. Request on first upgrade/undo action (lazy)

**Recommendation:** Option A - Clear expectations, better UX

### 2. Permission Loss Handling

**When handle becomes invalid (browser restart, permission revoked):**
- A. Auto re-request on next action
- B. Show persistent banner + manual re-enable

**Recommendation:** Option B - Respect user control

### 3. Conflict Resolution Strategy

**When target name exists:**
- A. Suffix: " - 2", " - 3" (human-friendly, recommended)
- B. Suffix: "(2)", "(3)" (Chrome default style)
- C. Timestamp: "- 1728588800" (guaranteed unique)

**Recommendation:** Option A - Aligns with PRD "human-first naming"

### 4. Large File Threshold

**Skip analysis/rename for files exceeding:**
- A. 50MB (conservative)
- B. 100MB (balanced, recommended)
- C. 200MB (permissive)

**Recommendation:** Option B - Configurable in settings

---

## Success Metrics

**Phase 1 (Wire Actions):**
- [ ] Apply action successfully renames 95%+ of files
- [ ] Retry logic handles busy files (< 5% failures)
- [ ] Permission flow has < 10% abandonment rate
- [ ] Zero data loss incidents

**Phase 2 (Background Analysis):**
- [ ] Upgrade proposals generated within 10s (p95)
- [ ] Upgrade acceptance rate > 60%
- [ ] AI analysis latency < 800ms (p95)
- [ ] User satisfaction with upgraded names > 80%

**Phase 3 (Optimization):**
- [ ] Native `move()` adoption > 90% when available
- [ ] Undo success rate 98%+
- [ ] Conflict resolution never shows Chrome default suffix

---

## References

### Web Research

1. **File System Access API:** https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
2. **Chrome Downloads API:** https://developer.chrome.com/docs/extensions/reference/api/downloads
3. **FileSystemHandle.move() Status:** https://chromestatus.com/feature/5640802622504960
4. **MDN File System API:** https://developer.mozilla.org/en-US/docs/Web/API/File_System_API

### PRD Alignment

- PRD §6: File System Access (Undo/Upgrade)
- PRD §5: Contextual Upgrade (background upgrade)
- PRD §7: Filename Policy (safe characters, conflict resolution)
- PRD §11: Error handling & fallbacks

### Related Epics

- Epic A: Multi-Media Instant Baseline & Upgrade Coverage
- Epic B: Confirm Modal, Mode Flows & Per-Type Controls
- Epic E: Observability, Telemetry & QA Expansion

---

## Appendix: Code Examples

### Complete Rename Flow

```typescript
// 1. User clicks Apply
// entrypoints/shared/ui/toast/toast-action-handler.ts
async function sendAction(toast, action, edited) {
  await sendConfirmToastDecision({
    toastId: toast.toastId,
    action: 'approve',
    editedFilename: edited,
  });
}

// 2. Background receives message
// entrypoints/background.ts
onExtensionMessage('confirmToastDecision', async ({ data }) => {
  await confirmToastController.handleUserDecision(data);
});

// 3. Controller routes to orchestrator
// entrypoints/background/toast/confirmation-controller.ts
async onUserDecision(entry, decision, helpers) {
  await executeApply(entry, decision, helpers);
}

// 4. Orchestrator executes rename
// entrypoints/background/rename-orchestrator.ts
async function executeApply(entry, decision, helpers) {
  const rootHandle = await getStoredDirectoryHandle(); // From IndexedDB
  const relativePath = getRelativePath(entry.proposal.originalFilename); // e.g., "subfolder/file.pdf"
  const result = await renameFile({
    relativePath,
    newFilename: decision.editedFilename || entry.proposal.proposedFilename,
    rootHandle,
  });

  if (result.success) {
    await updateHistoryItem(entry.historyId, (item) => ({
      ...item,
      final: result.finalName,
      path: result.finalPath,
    }));
    await helpers.emitStatus('applied');
  }
}

// 5. File system executes copy+delete (or stream for large files)
// entrypoints/shared/filesystem/rename-operations.ts
async function renameFile({ relativePath, newFilename, rootHandle }) {
  // Walk to parent directory + get leaf filename
  const { dir, leaf } = await getParentAndLeaf(rootHandle, relativePath);

  // Sanitize Windows reserved names
  const safeName = sanitizeWindowsBasename(newFilename);

  // Get source file
  const oldHandle = await dir.getFileHandle(leaf);
  const file = await oldHandle.getFile();

  // Resolve conflicts
  const finalName = await resolveConflict(dir, safeName);

  // Create new file
  const newHandle = await dir.getFileHandle(finalName, { create: true });
  const writable = await newHandle.createWritable();

  try {
    // Stream large files, direct write for small
    if (file.size > 10 * 1024 * 1024) {
      await file.stream().pipeTo(writable); // Auto-closes
    } else {
      await writable.write(file);
      await writable.close();
    }

    // Delete old file only after successful copy
    await dir.removeEntry(leaf);

    return { success: true, finalName, finalPath: /* reconstruct path */ };
  } catch (error) {
    // Ensure stream is closed to avoid .crswap orphans
    if (writable) await writable.close();
    throw error;
  }
}
```

---

**Next Steps:**
1. Review this plan with team
2. Create implementation tasks in phase-2-implementation-epics.md
3. Start with Phase 1.1 (File System Access Module)
4. Iterate based on testing feedback
