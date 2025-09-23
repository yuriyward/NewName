# PRD — Business Perspective (v2) — “NewName”

**Owner:** Yuriy Babyak
**Date:** 22 Sep 2025
**Platforms:** Chrome extension (MV3). Optional desktop helper (later).

## 1) Summary

NewName automatically gives new files short, human-like names. It renames instantly using page/download context (Phase 1), then optionally upgrades the name using lightweight content analysis (Phase 2). Processing is **local-first** using Chrome’s **built-in AI** (Prompt, Summarizer, Language Detector). An **explicit, opt-in cloud fallback** (Firebase AI Logic → Gemini) is available. Users can **Undo** and **Upgrade** post-save thanks to one-time **Downloads folder** access via File System Access.

## 2) Problem & Opportunity

People accumulate poorly named files; retrieval is slow. Current renamers are rule-based and robotic. NewName provides **human-like titles** with **zero friction**, boosting personal and professional file hygiene without changing user habits.

## 3) Target Users & Jobs

**Segments**

* Knowledge workers / Students / Researchers: papers, forms, notes.
* Operations / HR / Finance: invoices, contracts, statements.
* Creators / Engineers: screenshots, design exports, specs, recordings.
* Everyday users: photos, tickets, receipts.

**Jobs-to-be-Done**

* “When I download a file, I want a clear, specific name—without manual edits.”
* “When scanning a folder, I want to recognize items by name alone.”

## 4) Goals & Non-Goals

**Goals**

* Names feel **human**, localized, usually ≤ 60 chars.
* **Local-first**: built-in Chrome AI; degrade gracefully to metadata-only.
* **Explicit cloud fallback** (opt-in, per-type scope, data-minimized).
* **Decision-first**: rename only when it clearly improves clarity.
* **Undo/Upgrade** available after save (Downloads folder access).
* **Privacy-forward** defaults; transparent when geo/site/date influence naming.

**Non-Goals**

* Heavy document understanding/archiving.
* Rigid enterprise taxonomy (templates later).
* Full media transcription/translation.

## 5) Core Principles

1. **Human-first naming** (Subject → optional Qualifiers that truly clarify).
2. **Minimal friction** (auto on save; 1-click Undo/Upgrade).
3. **Just enough context** (page/URL, first pages/keyframes only).
4. **Trust & privacy** (on-device by default; explicit cloud consent).
5. **Deterministic safety** (safe characters, length caps, one dot before extension).

## 6) High-Level Flow

### Phase 1 — Instant Context Analysis (<1s)

* **Trigger:** `chrome.downloads.onDeterminingFilename`.
* **Signals:** page title/H1, link text/ARIA, domain/URL path, file type, timestamp, user language preference.
* **Action:** Heuristic + optional micro Prompt formatting → `suggest()`; download completes instantly.
* **Feedback:** Toast: “Renamed (On-device) to **…**” · Undo · Edit.

### Phase 2 — Background AI Enhancement (10s–1m, optional)

* **Runtime:** Offscreen document hosts **Summarizer/Prompt/Language Detector** sessions.
* **Content access:** Re-fetch original URL with **Range**; process first 2–5 PDF pages (text-first), or a small image/keyframe/audio slice for images/video/audio.
* **PDF strategy:**

  * **Born-digital:** extract text → **Summarizer(type:'headline')** → candidate(s).
  * **Scanned/low-text:** MuPDF WASM rasterize first pages → Prompt (image) or OCR fallback.
* **Compare & Decide:** If upgraded title scores higher → show **Upgrade** notification with reasoning and Apply/Details.

### Post-save Operations — Upgrade & Undo

* Onboarding requests one-time **Downloads** access (File System Access).
* Store minimal history (original/final/path, processing source).
* **Undo/Upgrade** move the file safely via `FileSystemHandle.move()`.

### Hybrid AI Routing

* **Primary:** Chrome built-in AI (on-device).
* **Fallback (opt-in):** Firebase AI Logic; send only trimmed snippets, never raw files; per-type scope.

## 7) Inspection Strategy (per type)

* **PDF/Docs:** First 2–5 pages text; if no text → render first pages to images. Include form type/issuer + date when helpful.
* **Images:**

  * Screenshots → OCR window/app title;
  * Photos → subject; add place only if geolocation truly clarifies;
  * Scans → detect doc type/side.
* **Audio:** Brief intro transcript or short audio slice classification (meeting/memo/lecture).
* **Video:** 1–2 keyframes + short intro audio; classify (screen recording/tutorial/call).
* **Archives/Installers:** Top folder/product/version; add item count if useful.
* **Data/Code:** dataset shape or project name\@version (lightweight).

## 8) Decision Policy (Rename vs Keep)

Score 0–100; rename if ≥ threshold (default 60).

Illustrative weights:

* Content title/heading confidence … +35
* Recognized doc type (form/invoice/contract) … +20
* Helpful metadata (geo/date/duration) … +15
* Source clarity (site/vendor/model) … +10
* Existing name already clear … −30
* Low confidence/ambiguous … −20

## 9) Naming Rules (Human Style)

**Language**

* Setting: Auto (detect) / Browser default / PL / EN / UK / …
* Auto uses Language Detector; user can override per file in Confirm.

**Characters & Separators**

* Allowed: letters, numbers, spaces, dash `-`, underscore `_`, single dot before extension.
* Disallow: shell-hostile chars `: * ? " < > | \ /` and extra dots.
* Separator styles: **Clean** (default), **kebab-case**, **snake\_case**.

**Order & Length**

* Subject → optional Qualifiers (date `YYYY-MM-DD`, place, version, duration/resolution).
* Target length: 30–60 (configurable 40–80).
* Fallback: `YYYY-MM-DD-topic-short-hash`.

**Diacritics**

* Preserve by default; optional **Transliterate to ASCII** toggle.

## 10) Preferences & Controls (business-critical)

* **Mode:** Auto-rename / Confirm-before-apply / Silent / Custom.
* **Per-type toggles:** PDFs, Images, Audio, Video, Archives.
* **Filename language:** Browser / Auto / specific.
* **Separator style:** Clean / kebab / snake.
* **Metadata use:** Photo geo, Document date, Media duration/resolution, Source site hint (all toggles).
* **Cloud assist:** Opt-in, per-type scope, provider disclosure, data minimization.
* **History:** Recent actions with Undo/Redo/Edit; source badge (On-device/Cloud).

## 11) Architecture Notes (exec-level)

* **MV3 service worker**: listens for downloads; hands off work to offscreen page.
* **Offscreen document**: hosts built-in AI sessions, PDF.js/MuPDF, OCR if needed.
* **File System Access**: single user grant for **Downloads** enables reliable Upgrade/Undo.
* **Range fetching**: partial content fetch of originals to avoid full downloads in Phase 2.
* **Policy enforcement**: Prompt structured output schema guarantees safe filenames.

## 12) Success Metrics (opt-in, privacy-respecting)

* **Quality**: ≥ 80% of renamed files rated “clear & useful.”
* **Time saved**: ≥ 50% fewer manual renames after 2 weeks.
* **Adoption**: ≥ 70% keep Auto-rename after week 1.
* **Trust**: < 5% revert rate on renamed items.
* **Coverage**: 70–90% of eligible files renamed (rest intentionally kept).
* **Cloud usage**: % users enabling cloud assist; events per type (aggregate only).

## 13) Rollout Plan

**MVP (Weeks 1–3)**

* Phase 1 for PDFs + Images (screenshots/scans/photos).
* Text-first PDF naming; scan fallback via MuPDF raster → Prompt image.
* Onboarding with Mode selection + **Downloads** access; local-only by default.
* Toast + Undo; basic Settings; History (recent 50).

**v1**

* Audio/Video (keyframes + short intro audio), Archives/Installers.
* Confirm mode & per-type behavior; metadata toggles UI.
* Cloud fallback (opt-in) via Firebase AI Logic.
* Series awareness & smart conflict resolution.

**v2**

* Batch Review panel; per-folder behaviors; template builder; desktop helper (file watcher + local LLMs).

## 14) Risks & Mitigations

* **Incorrect titles** → Conservative threshold; Confirm mode; easy Undo.
* **Privacy concerns** → On-device default; explicit cloud consent; data minimization; clear badges.
* **Performance on large files** → Range fetch; cap pages/seconds; cache site hints; metadata-only fallback.
* **Model not ready / user-activation** → Capture activation in onboarding; show model status; metadata-only mode until ready.
* **Post-save renames** → Require Downloads access early; graceful path if user declines (Upgrade disabled; Undo limited to Phase 1).

## 15) Open Questions

1. Default Confirm policy for **legal/financial** docs—on by default in Balanced?
2. Per-folder rules (e.g., Photos/Work/Receipts) in v1 or v2?
3. What minimal, aggregate telemetry convinces privacy-sensitive users while proving value?
4. Should we surface a “never include geo” quick action on photo suggestions?

---

### Appendix A — Examples

* **PDF (residence permit):** `Wniosek o przedłużenie zezwolenia na pobyt - 2025-09-15`
* **Invoice:** `Biedronka - Faktura - 2025-03-04 - 146,20 PLN`
* **Screenshot:** `Figma - Navbar fix - dialog`
* **Meeting audio:** `Waypass - Sprint planning - Q4 goals - 45m`
* **Video tutorial:** `Supabase - CORS dla Edge Functions - 1080p - 12m`
* **Photo:** `Zachód słońca - Tatry - Morskie Oko - 2025-08-17`
