# Image Analysis Upgrade Implementation Plan

**Date:** 2025-10-17
**Status:** Draft for review
**Related:** post-download-rename-implementation-plan.md, post-download-rename-implementation-status.md, ai-text-upgrade-implementation-plan.md

---

## 1. Scope & Objectives

- Deliver Phase 2 image analysis pipeline that mirrors the existing text upgrade flow.
- Target on-device Prompt API first; design hybrid fallbacks so cloud/remote can be enabled later.
- Produce high-confidence rename proposals for screenshot/photography-style downloads while keeping token usage within Prompt API limits.
- Persist image descriptions in history so support and users can audit rename rationale.

Out of scope (for this milestone):
- PDF/text upgrades (already tracked elsewhere).
- Full hybrid/cloud consent UX.
- Undo UI improvements.

---

## 2. Dependencies & Preconditions

### 2.1 Chrome Prompt API Status
- **Current state:** Chrome 138 Canary only; Early Preview Program (EPP) restricted. Multimodal API shapes may change before stable release.
- **OS/Hardware:** Windows 10+, macOS 13+, Linux, ChromeOS 16389.0.0+ only. Requires GPU (4GB+ VRAM) OR CPU (16GB+ RAM, 4+ cores). 22GB free disk for model download.
- **Platform exclusions:** Chrome for Android, iOS, and non-Chromebook-Plus ChromeOS **not supported**.
- **Input support:** Text, image, audio accepted; text-only output.
- **Implications:** Feature must gracefully degrade if Prompt API unavailable; verify capability at runtime; telemetry needed to track platform availability.

### 2.2 Required Components
- **Chrome Prompt API Multimodal support:** extension must pass origin-trial checks; guard runtime availability.
- **On-device Gemini Nano:** ensure model download readiness via existing `ensureAiModelsReadyRemote`.
- **File System Access permissions:** reuse `getStoredDirectoryHandle` + `verifyDirectoryPermission`.
- **Shared RangeFetch utilities:** only needed when the download URL is remote-only; initial milestone reads from local download handle.

---

## 3. High-Level Pipeline

1. **Ingestion (new `image-analysis-handler.ts`):**
   - Resolve file handle, create `ImageBitmap` via `createImageBitmap()`.
   - Downscale proportionally so longest edge ≤ 384 px (verify via `Math.min(1, 384 / Math.max(width, height))`).
   - For very large images (>10MB raw), consider iterative downscaling (50% → 25% → ...) to avoid memory spikes.
   - Encode downscaled bitmap to `image/png` via `OffscreenCanvas.convertToBlob()`.
   - **Note:** Prompt API may handle image resizing internally; if so, pass bitmap directly without custom downscale. Validate with Canary spike.
   - Record original dimensions/size, resized dimensions, downscale ratio.
   - Return blob as `ArrayBuffer` plus metadata to pipeline orchestrator.

2. **Phase 1 & 2 – Describe & Decide (Prompt API call #1, possibly consolidated):**
   - Create Prompt API session with `expectedInputs` for text + image.
   - **Optimization:** Try consolidating "describe + decide" into single prompt if possible:
     ```
     System: You are a file renaming AI. Given an image, describe it in 1-2 sentences,
     then output JSON: {description, confidence, shouldRename}
     Image: [bitmap]
     Filename: "IMG_1234.jpg"
     ```
   - If consolidation not feasible, keep as two separate calls (describe + decide).
   - Provide system prompt focused on concise, noun-heavy captions; ensure output ≤ 120 characters.
   - Stream response; aggregate into single description string.
   - Capture token usage via `session.measureInputUsage()` for telemetry.
   - **Warn if description exceeds 120 chars** (may indicate model verbosity or image complexity).

3. **Phase 3 – Filename Generation (Prompt API call #2 or #3 depending on consolidation):**
   - Reuse `generateFilenameStem` to map description into policy-compliant stem.
   - Compose final filename via `buildFilename`.

4. **Persistence & Messaging:**
   - Extend history items with `imageSummary` (description text + metadata).
   - Surface decision metrics (confidence, token counts, resize ratio) for observability.
   - Return `UpgradeProposal` to upgrade coordinator with `reasonTags` indicating image-derived rename.

---

## 4. Work Breakdown

### 4.1 Offscreen Handler
- Add `entrypoints/offscreen/image-analysis-handler.ts` modeled after text handler.
- Export `initializeImageAnalysisHandler()` and wire it inside `entrypoints/offscreen/main.ts`.
- Implement ingestion helper (`ingestImageForPrompt`) encapsulating resize/encode logic.

### 4.2 Shared Utilities
- Create `entrypoints/shared/integrations/image-analysis/` with:
  - `constants.ts` – thresholds (max edge 384 px, minimum dimensions, byte ceilings).
  - `types.ts` – request/response contracts shared with background.
  - `prompt-helpers.ts` – multimodal prompt builders (description prompt, decision prompt wrappers) that default to PNG inputs.
  - `telemetry.ts` – counters for availability, failures, truncation, resize ratios.

### 4.3 Prompt Sessions
- Extend shared Prompt helpers to support `{ type: 'image/png' }` inputs and chunked streaming.
- Add description prompt template emphasizing factual, short captions; ensure output is ≤120 characters.
- Update `rename-decision.ts` to accept optional `summarySource` (text vs. image) for logging.

### 4.4 Background Wiring
- Update `entrypoints/background/upgrade/coordinator.ts` to request image analysis for file types `image/*` when Phase 1 baseline signals low quality.
- Add messaging endpoints (`requestImageIngestion`, `imageUpgradeResult`) analogous to text flow.

### 4.5 History & Storage
- Extend `entrypoints/shared/history/types.ts` with `imageAnalysis?: { description: string; resizedWidth: number; resizedHeight: number; originalWidth: number; originalHeight: number; resizeRatio: number; decisionConfidence?: number; }`.
- Update history persistence (`history.ts`, `storage.ts`) to store and retrieve the new field.
- Update any UI consumers (e.g., toast overlays) if they need to surface the description.

### 4.6 Telemetry & Error Handling
- Record resize outcomes (no-resize, downscaled, failed) and Prompt API availability failures.
- Guard for: unsupported formats, huge images (e.g., >20 MB after downscale), Prompt API `NotSupportedError`, `AbortError`, quota overruns.
- Emit structured error responses (`status: 'error' | 'unavailable' | 'skipped'`) consistent with text analysis.
- **New telemetry:** `multimodalPromptApiAvailable: boolean`, `imageResizeRatio: number`, `promptApiCallDuration_ms: number` per phase, `imageSummarySizeBytes: number`.

---

## 5. Testing Strategy

- **Unit:** mock `OffscreenCanvas` to validate resize math, ensure longest edge ≤ 384 px, verify MIME negotiation.
- **Prompt Helpers:** stub `LanguageModel` to confirm we pass image + text inputs.
- **Integration:** offscreen handler round-trip (ingestion + pipeline) with synthetic image.
- **Regression:** ensure text pipeline remains unchanged; add tests guarding shared helper behavior when `summarySource === 'image'`.

---

## 6. Rollout Considerations

- Feature-flag via settings (e.g., `imageAnalysis.mode`) defaulting to `on-device-only`.
- If Prompt API availability check returns null/unavailable, record telemetry, short-circuit, and optionally queue a toast explaining the limitation.
- Prepare follow-up tasks for hybrid/cloud consent once device-only proves stable.

---

## 7. Critical Pre-Implementation Spikes

**Priority 1 – Before coding:**
1. **Validate Prompt API multimodal shape:** Test with Chrome 138 Canary to confirm image input format (e.g., does `createImageBitmap()` work, or pass raw Blob?).
2. **Check image resizing responsibility:** Confirm whether Prompt API auto-scales images or if custom `OffscreenCanvas` resize is needed.
3. **Document token costs:** Measure actual token usage for typical screenshots/photos after downscale.

**Priority 2 – Design decisions (resolved):**
- **PNG only** – No WEBP fallback unless Chrome docs explicitly support it. PNG is safe, `OffscreenCanvas.convertToBlob()` defaults to PNG.
- **No blob caching** – Regenerate downscaled images on demand (undo flow is rare, storage overhead not worth it).
- **Descriptions internal only** – Don't surface to UI by default; use debug flag for testing.
- **Consolidate prompts if possible** – Try merging "describe + decide" into single Prompt API call to halve token usage and latency.

**Priority 3 – Error resilience:**
- Add `isMultimodalPromptAvailable()` capability check before attempting image analysis.
- Emit telemetry on every Prompt API failure (quota, NotSupported, AbortError, timeout).
- Log token usage; warn if descriptions exceed 120 chars.

---

## 8. Open Questions (Resolved)

1. **Preferred fallback MIME (PNG vs. WEBP)?** → **Resolved:** PNG only. No WEBP fallback unless Chrome docs prove support.
2. **Cache downscaled blobs for undo?** → **Resolved:** No. Regenerate on demand; caching adds complexity for rare use case.
3. **Surface image descriptions in UI?** → **Resolved:** Internal only with debug flag. Descriptions are implementation detail; users care about filenames.

---

_End of plan._
