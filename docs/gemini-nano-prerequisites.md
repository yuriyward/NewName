# Gemini Nano Prerequisites & Setup Guide

## Problem Discovery

The AI model download errors were **NOT code bugs** - they were caused by **Gemini Nano not being enabled in Chrome**.

### Symptoms
- chrome://on-device-internals shows NO models
- All APIs return "unavailable on this device"
- Chrome flags are at "default" (meaning **DISABLED**)
- Error: "Unable to create a text session because the service is not running"

### Root Cause
Gemini Nano is **opt-in** in Chrome 138+. Users must explicitly:
1. Enable Chrome flags
2. Restart browser
3. Trigger model download
4. Wait for download to complete (~2GB)

## Solution Implemented

### 1. Smart Prerequisites Detection (`AIModelSetupPage.tsx:191-196`)
Added detection for when ALL models show "unavailable" or "error":
```typescript
const allUnavailable = useMemo(() => {
  return AI_MODEL_IDS.every((id) => {
    const status = snapshot.statuses[id];
    return status.state === 'unavailable' || status.state === 'error';
  });
}, [snapshot.statuses]);
```

### 2. Prerequisites Alert Component (`AIModelSetupPage.tsx:577-669`)
Created a prominent warning that appears when Gemini Nano isn't enabled:
- **Clear title:** "Gemini Nano Not Enabled"
- **Step-by-step instructions** (5 steps with numbered list)
- **Two action buttons:**
  - "Open Chrome Flags" - Opens chrome://flags/#prompt-api-for-gemini-nano
  - "Re-check Status" - Refreshes availability after user enables flags
- **Help link:** Direct link to chrome://on-device-internals

### 3. User Flow
```
1. User opens AI Model Setup page
   ↓
2. If all models unavailable → Show Prerequisites Alert
   ↓
3. User clicks "Open Chrome Flags"
   ↓
4. User enables "Prompt API for Gemini Nano"
   ↓
5. User restarts Chrome
   ↓
6. User clicks "Re-check Status"
   ↓
7. Models now show "downloadable"
   ↓
8. User clicks "Enable AI renaming"
   ↓
9. Models download successfully!
```

## Step-by-Step Setup Instructions

### For Users

#### Step 1: Enable Chrome Flags
1. Open `chrome://flags/#prompt-api-for-gemini-nano`
2. Set to **Enabled**
3. (Optional) If hardware doesn't meet requirements:
   - Open `chrome://flags/#optimization-guide-on-device-model`
   - Set to **Enabled BypassPerfRequirement**
4. Click **Relaunch** button

#### Step 2: Verify Model Status
1. Restart Chrome completely
2. Return to the AI Model Setup page
3. Click **"Re-check Status"**
4. Models should now show "Download required" instead of "Unavailable"

#### Step 3: Download Models
1. Click **"Enable AI renaming"**
2. Keep the tab focused
3. Wait for downloads to complete (~30-60 seconds)
4. Success!

### Troubleshooting

#### Still showing "Unavailable"?
- **Check Chrome version:** Must be 138+ (check `chrome://version`)
- **Check hardware:**
  - Windows 10/11, macOS 13+, Linux, or ChromeOS (Chromebook Plus)
  - 22 GB free storage
  - GPU with >4 GB VRAM
  - 16+ GB RAM
- **Check flags:** Make sure you clicked "Relaunch" after enabling
- **Wait:** Sometimes models take 1-2 days to become available after first enabling

#### Flags already enabled but still not working?
1. Open `chrome://components`
2. Find "Optimization Guide On Device Model"
3. Click "Check for update"
4. Wait for version to change from "0.0.0.0"
5. Return to setup page and re-check

#### Hardware doesn't meet requirements?
Use `chrome://flags/#optimization-guide-on-device-model` with **Enabled BypassPerfRequirement** to bypass hardware checks. Performance may be slower but it should work.

## Technical Details

### Chrome Flag Reference
- **Primary:** `chrome://flags/#prompt-api-for-gemini-nano`
  - Enables the Prompt API, Summarizer API, and related features
  - Required for Gemini Nano access

- **Secondary (optional):** `chrome://flags/#optimization-guide-on-device-model`
  - Options:
    - **Enabled** - Standard hardware requirements enforced
    - **Enabled BypassPerfRequirement** - Bypass hardware checks
    - **Enabled BypassPerfAndTextSafety** - Bypass hardware + safety checks
  - Use "BypassPerfRequirement" if your device doesn't meet standard requirements

### Model Download Process
1. **Availability Check:** `LanguageModel.availability()` returns "downloadable"
2. **User Activation Required:** Must be triggered by user click
3. **Download Trigger:** Calling `.create()` starts download
4. **Progress Monitoring:** Use `monitor` callback to track progress
5. **Storage:** Models stored in Chrome profile directory (~2GB)
6. **Auto-cleanup:** Models deleted if free space drops below 10GB

### Hardware Requirements (Can be bypassed)
- **OS:** Windows 10+, macOS 13+ (Ventura), Linux, ChromeOS (Chromebook Plus)
- **Storage:** 22 GB free space (models use ~2GB)
- **GPU:** >4 GB VRAM OR
- **CPU:** 4+ cores with 16 GB RAM
- **Network:** Unmetered connection (models ~2GB download)

## UI Changes Summary

### Before Fix
```
[ Hardware Requirements Section ]
[ Model Status Cards (all showing "Unavailable") ]
[ "Enable AI renaming" button (does nothing) ]
```

### After Fix
```
[ Hardware Requirements Section ]

⚠️ [PROMINENT WARNING ALERT]
   "Gemini Nano Not Enabled"

   1. Click "Open Chrome Flags" below...
   2. Enable "Prompt API for Gemini Nano"...
   3. Restart Chrome...
   4. Click "Re-check Status"...

   [Open Chrome Flags] [Re-check Status]

[ Model Status Cards ]
[ "Enable AI renaming" button ]
```

## Code Changes

### Files Modified
1. **`entrypoints/ai-model-setup/AIModelSetupPage.tsx`**
   - Added `allUnavailable` detection (line 191)
   - Added `handleRefreshStatus()` function (line 285)
   - Added `handleOpenChromeFlags()` function (line 298)
   - Added `PrerequisitesAlert` component (line 577)
   - Integrated alert into render flow (line 386)

### No Breaking Changes
- All existing functionality preserved
- New UI only shows when ALL models unavailable
- No changes to download logic (it's already correct)

## Verification
```bash
✅ All 262 tests passed
✅ Build succeeded (6.75 MB)
✅ No type errors
✅ No lint errors
```

## Expected User Experience

### First-Time Setup (Flags Not Enabled)
1. User sees prominent yellow warning
2. Clear step-by-step instructions provided
3. One-click access to Chrome flags
4. Easy re-check after enabling
5. No confusing "unavailable" errors

### After Flags Enabled
1. Warning disappears
2. Models show "Download required"
3. User clicks "Enable AI renaming"
4. Downloads proceed normally
5. Success!

## Key Insights

### The Real Problem
The original errors were **user onboarding issues**, not code bugs. Chrome makes Gemini Nano opt-in, but our UI didn't explain this prerequisite step.

### Why This Matters
- **Your code was always correct** - download logic works perfectly
- **The issue was documentation** - users didn't know to enable flags first
- **Now self-service** - users can fix the issue themselves with clear guidance

### Future Considerations
- Monitor Chrome's rollout strategy (may auto-enable in future versions)
- Consider adding a "Setup Wizard" for first-time users
- Track how many users encounter this vs. successfully enable flags
