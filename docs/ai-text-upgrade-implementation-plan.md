# AI Text Upgrade Implementation Plan

**Author:** Codex Planning Session  
**Date:** 2025-10-12  
**Status:** Draft / Ready for Estimation  
**Related:** post-download-rename-implementation-plan.md, phase-2-implementation-epics.md, ai/docs/ai-chrome-*.md

---

## Objective

Deliver contextual upgrade support for text-based downloads (Markdown, plain text, rich text, source documents) by extracting salient content and generating higher quality filenames with Chrome’s built-in AI stack (Language Detector, Summarizer, Prompt APIs). The goal is to reach parity with the Phase 2 roadmap for textual assets before tackling PDFs and images.

---

## Success Criteria
- ≥90 % of supported text downloads receive an upgrade proposal when content length ≥ 1 KB and built-in AI is available.
- Auto-apply accuracy for deterministic templates ≥ 95 % (as measured by manual review / sampling).
- Graceful fallback to instant baseline naming when AI features are unavailable, declined, or exceed size limits.
- No regressions in download rename latency beyond the existing upgrade scheduling budget.

---

## Scope
- **In Scope**
  - Plain text (`.txt`), Markdown (`.md`), source files (`.js`, `.ts`, `.py`, etc.), and lightweight HTML snippets once sanitized.
  - Language detection and summarization using Chrome on-device models where supported.
  - Hybrid prompting fallback to Firebase AI Logic (cloud) when the user opts in.
  - Structured proposal generation with reason tags integrated into history records.
- **Out of Scope (Future)**
  - Rich binary formats (PDF, DOCX) and image OCR flows.
  - Deep semantic classification (topic detection, named entities beyond summarizer output).
  - Non-Chrome browsers lacking built-in AI support (handled by fallback policy).

---

## Constraints & Assumptions
- Built-in AI APIs require Chrome 138+, hardware that passes availability checks, and user activation for model downloads.
- Offscreen document already hosts media analyzers; text analysis module will share the same sandbox bridge.
- Maximum text payload sent to AI must stay within 128 KB to respect performance budgets; larger files use excerpt strategy.
- Instant baseline decision artifacts (strategy + filename) remain the fallback source of truth.
- User privacy: on-device processing is default; hybrid fallback requires explicit opt-in stored in settings.

---

## High-Level Flow
1. **Download Completion:** Upgrade coordinator receives a completed download event and filters for eligible text file types + settings.
2. **Handle Restoration:** Retrieve file handle via `handle-storage` and ensure read permission.
3. **Ingestion:** Offscreen worker streams up to `textIngest.maxBytes` (default 128 KB) using the shared range-fetch utility; strip HTML tags, normalize whitespace, and detect encoding.
4. **Language Detection:** Run `LanguageDetector.create()` once per session; cache result and annotate request with ISO language code + confidence.
5. **Summarization:** Instantiate `Summarizer.create()` (batch mode, `type: 'key-points'`, `length: 'short'`) to distill main bullet points. Capture monitor events to surface download progress for large models.
6. **Prompted Filename Generation:** Establish a Prompt API session with JSON schema enforcing `{ stem: string; qualifiers: string[]; confidence: number; explanation: string; }`. Supply context (language, summarizer bullets, instant baseline metadata).
7. **Policy Enforcement:** Pass generated stem/qualifiers through existing `policy-engine` sanitizers and conflict resolution. Produce final proposed filename + reason tags.
8. **Upgrade Delivery:** Coordinator stores proposal in history, queues toast/auto-apply with AI attribution, and records telemetry.
9. **Fallback Handling:** If any stage fails, return `null` to keep instant baseline name and surface diagnostic logs.

---

## Component Work Breakdown

### Upgrade Coordinator (`entrypoints/background/upgrade/coordinator.ts`)
- Extend `shouldAnalyzeUpgrade` to include text MIME/extensions and user settings flag.
- Replace mock `requestAnalysis` call with real `requestTextUpgrade` IPC.
- Introduce per-file size guards and cooldown logic for large text files.
- Emit telemetry events for `language`, `summarizerType`, `promptModel`, and failure modes.

### Offscreen Worker (`entrypoints/offscreen/main.ts`)
- Register new `browser.runtime.onMessage` handler for `text-upgrade.request`.
- Delegate ingestion to shared helpers (range fetch, encoding detection).
- Lazily initialize and cache Language Detector and Summarizer instances; support rehydration after service worker restarts.
- Bridge Prompt API session creation via `navigator.languageModel` with abort signalling and structured output parsing.

### Shared Integrations
- **`entrypoints/shared/integrations/range-fetcher.ts`:** Build reusable partial download helper supporting byte range reads, timeouts, and auth headers (repurposed by media + text).
- **`entrypoints/shared/integrations/text-analysis/normalize.ts`:** New module to trim BOM, normalize newlines, strip Markdown fences when necessary.
- **`entrypoints/shared/utils/encoding.ts`:** Detect UTF-8/UTF-16/Latin1 using BOM + heuristics.

### Settings & Permissions
- Add a `ai.textUpgrades` toggle plus `ai.hybridFallback` flag to `settings.ts`.
- Surface consent copy in onboarding or settings UI describing on-device vs cloud fallback.

### History & Telemetry
- Extend `HistoryItem.upgrade` schema with `language`, `summaryPreview`, `promptConfidence`, `modelSource`.
- Update analytics pipeline (if present) to capture success/failure counts per API.

---

## Implementation Phases

### Phase A — Foundations (2–3 days)
1. Generalize range fetcher and text normalization utilities.
2. Define TypeScript contracts for text upgrade requests/responses (shared types).
3. Wire coordinator to new offscreen `requestTextUpgrade` pathway with feature detection stubs.

### Phase B — On-Device AI Integration (4–5 days)
1. Implement language detection workflow with model availability cache and timeout handling.
2. Implement summarizer batch flow with configurable type/length; include progress metrics.
3. Add Prompt API session logic with JSON schema enforcement and error categorization.
4. Integrate policy engine to finalize filenames, map explanations to reason tags.

### Phase C — Hybrid Fallback & Polish (3–4 days)
1. Add optional Firebase AI Logic bridge when built-in APIs unavailable and user opted-in.
2. Surface user-facing telemetry (toast badges, settings) indicating AI source.
3. Harden error recovery (retry budgets, service worker restarts, model download prompts).
4. Update documentation (`post-download-rename-implementation-status.md`) and dashboards.

---

## Testing Strategy
- **Unit Tests:** Cover text normalization, range fetcher edge cases, prompt schema parsing.
- **Integration Tests:** Fake browser APIs (`fakeBrowser` harness) to simulate availability states, summarizer outputs, and fallback behavior.
- **Manual QA:** Verify rename proposals on representative file set (release notes, code snippets, long blog posts) under three environments:
  1. Chrome 138 on supported hardware (built-in AI path).
  2. Chrome 138 on unsupported hardware (hybrid fallback).
  3. Chromium-based browser without APIs (instant baseline fallback).
- **Telemetry Validation:** Ensure success/failure counters increment, model download progress logged, and toast messaging accurate.

---

## Risks & Mitigations
- **Model Download Latency:** Mitigate by triggering availability checks during onboarding and displaying progress via toast notifications.
- **Large Files / Memory Pressure:** Enforce strict byte caps and stream processing to avoid buffering entire files.
- **API Availability Drift:** Guard every invocation with feature detection and fall back cleanly to deterministic naming.
- **Privacy Concerns:** Default to on-device processing, gate hybrid fallback behind explicit consent with clear wording.

---

## Open Questions
1. Do we need per-language prompt templates (e.g., non-Latin scripts) or can the Prompt API handle localization with a single schema?
2. How should we weight instant baseline scores when auto-applying AI-proposed names (confidence blend vs threshold)?
3. Should summary previews be surfaced in the history UI for transparency?

---

## Next Steps
1. Review plan with stakeholders; adjust estimates and dependencies.
2. Create subtasks under Phase 2 epics (range fetcher, offscreen text pipeline, AI integrations).
3. Prioritize Phase A foundations immediately to unblock parallel development of PDF/image analyzers.

