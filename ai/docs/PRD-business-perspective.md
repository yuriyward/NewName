# PRD - Business Perspective — “NewName”

**Owner:** Yuriy Babyak
**Date:** 22 Sep 2025
**Platforms:** Chrome extension

## 1) Summary

NewName automatically gives files short, human-like names. It evaluates new files as they’re saved/downloaded, decides whether renaming adds value, then generates a concise, context-aware title using content snippets (e.g., first few pages of PDFs) and useful metadata (e.g., geolocation in photos). Everything runs locally by default, with an explicit, opt-in fallback to cloud AI when the device cannot execute on-device models.

## 2) Problem & Opportunity

* People accumulate poorly named files; finding anything later is slow and frustrating.
* Existing filename “cleaners” use generic rules or unreliable tags—results feel robotic.
* A lightweight assistant that titles “like a human” creates immediate value across personal and professional workflows without changing user habits.

## 3) Target Users & Primary Jobs

* **Knowledge workers / Students / Researchers**: papers, forms, lecture notes, reports.
* **Operations / HR / Finance**: invoices, contracts, statements, certificates.
* **Creators / Engineers**: screenshots, design exports, recordings, tutorials, specs.
* **Everyday users**: photos, travel docs, tickets, receipts.

**Jobs-to-be-Done**

* “When I download or save a file, I want it to have a clear, specific name so I can find it later without opening it.”
* “When I review a folder, I want to quickly recognize items by their names alone.”

## 4) Goals & Non-Goals

**Goals**

* Accurate, human-like names in the **user’s language**, usually ≤ 60 characters.
* **Local-first pipeline**: prefer built-in Chrome AI (Gemini Nano via Prompt/Summarizer APIs) or bundled models; degrade gracefully.
* **Explicit cloud fallback** only when the user opts in and when local execution is unavailable or insufficient.
* **Decision first**: rename only when it clearly improves the name.
* **Deeper inspection** when helpful (e.g., first 2–5 pages of PDFs; keyframes + short transcript for videos).
* Use **high-signal metadata** (e.g., geolocation, dates, duration, resolution) when it truly clarifies.
* Privacy-first: default to on-device processing; no cloud by default.

**Non-Goals**

* Full content processing/archiving; heavy document understanding.
* Enforcing rigid, enterprise taxonomy (can come later as templates).

## 5) Core Principles

1. **Human-first naming**: subject → qualifier (place/date/version) only if it adds clarity.
2. **Minimal friction**: auto on new saves; 1-click revert or edit.
3. **Just enough context**: inspect a **small but richer** slice (e.g., first few pages/keyframes)—not whole files.
4. **Trust & privacy**: content stays local by default; metadata use is transparent and user-controlled.

## 6) High-Level Flow (Context-First + Progressive Enhancement)

### 6.1 Phase 1: Instant Context Analysis (<1 second)

1. **Intercept download**: Use `chrome.downloads.onDeterminingFilename` to capture download events.
2. **Lightning-fast context analysis**:
   * **Page context**: title, headings, domain, URL patterns
   * **Download context**: link text, surrounding content, file path hints
   * **User patterns**: recent downloads, folder preferences, naming habits
   * **Metadata**: file type, size, source domain, timestamp
3. **Smart guess generation**: Combine context signals for immediate intelligent name
4. **Apply context-based name**: Call `suggest()` with smart guess; download completes instantly

### 6.2 Phase 2: Background AI Enhancement (10s-1min, optional)

5. **Capability check**: detect on-device model availability, hardware (NPU/GPU), and user consent flags for cloud fallback.
6. **Background content analysis** (non-blocking):
   * **Content snippets** by type (PDF: first 2–5 pages text; Image: caption/OCR; Audio/Video: short transcript + 1–2 keyframes).
   * **Deep content understanding**: document structure, subjects, entities, language detection
7. **AI-powered title generation**: Produce 1–3 content-based candidates
8. **Quality comparison**: Score AI name vs. context-based name
9. **Upgrade decision**: If AI name significantly better → offer upgrade to user

### 6.3 Phase 3: User Choice & Learning

10. **Upgrade notification**: "Found better name based on content: [AI name] • Apply • Details"
11. **User feedback**: Accept, decline, or edit the AI suggestion
12. **Learn & adapt**: Improve Phase 1 context analysis based on user preferences

### 6.4 Hybrid AI Routing (Strategic Layer)

* **On-device primary path**: use Chrome built-in Prompt/Summarizer APIs or packaged lightweight models for OCR/audio snippets when available.
* **Cloud secondary path**: when the primary path is unavailable (unsupported browser/OS, insufficient hardware, or user-triggered re-analyze), call Gemini via Firebase AI Logic using a signed-in Google account or service key.
* **User consent gate**: first-time fallback prompts detail data handling, retention, and cost; users can revoke later.
* **Data minimization**: send only trimmed context packets (no raw files) to cloud; redact sensitive tokens flagged by heuristics before transmission.

## 7) Inspection Strategy (per type)

* **PDF / Word / Slides**: Parse headings + first 2–5 pages (more reliable titles, form names, dates). If form, include form type/issuer + date.
* **Images**:

  * Screenshots: window/app title via OCR.
  * Photos: describe subject; **if geolocation present and helpful**, add place (city/landmark/venue).
  * Scans: detect doc type (“dowód osobisty”, “paragon”, “umowa”) and side (front/back).
* **Audio**: short intro transcript (first 30–120s) + duration; classify (meeting, lecture, memo).
* **Video**: 1–2 informative keyframes + short intro transcript + duration/resolution; classify (screen recording, tutorial, call).
* **Archives/Installers**: derive from top folder/product/version; add count if useful.
* **Data/Code**: dataset shape (rows×cols) or project name\@version.

## 8) Decision Policy (Rename or Not)

Score each file 0–100 across signals; rename if score ≥ threshold (e.g., 60).

**Signals & Weighting (illustrative)**

* Content Title/Heading confidence ………… +35
* Recognized Document Type (form, invoice) … +20
* Useful Metadata (geo/date/duration) ……… +15
* URL/Site clarity (vendor name/model) …… +10
* Existing name quality (penalty if already good) −30
* Low confidence/ambiguous content ………… −20

**Examples**

* `IMG_4021.HEIC` with GPS near “Morskie Oko” at sunset → **Rename**.
* `invoice_2025.pdf` with vendor + total on page 1 → **Rename** to specify vendor & date.
* `Supabase_Edge_Functions_CORS.pdf` (already clear) → **Keep**.

## 9) Naming Policy (Human Style)

### A) Language Policy

* **Setting**: "Filename language"
  * **Default**: Browser UI language (e.g., `pl-PL`)
  * **Options**: `Auto (detect from content)`, `Polski`, `English`, `Українська`, etc.
* **Behavior**:
  * If set to specific language → always title in that language
  * If **Auto** → detect language from snippet; fall back to browser language if uncertain
  * Changing this setting does **not** retro-rename past files unless explicitly triggered

### B) Characters & Separators (Cross-Platform Safe)

* **Allowed characters**:
  * Letters, numbers, spaces, **dash** `-`, **underscore** `_`, and one **dot** before extension
  * **Prohibited**: parentheses, brackets, emojis, extra dots, shell-hostile characters (`: * ? " < > | \ /`)
* **Separator style (setting)**:
  * **Clean (default)**: `Subject - Qualifier - ExtraTokens`
  * **CLI-friendly**: `kebab-case` (e.g., `subject-qualifier-extra`)
  * **Data-friendly**: `snake_case` (e.g., `subject_qualifier_extra`)

### C) Token Order & Inclusion Rules

* **Order**: `Subject` → optional `Qualifier(s)` → optional `Tokens`
* **Include only if clarifying**:
  * **Date** → `YYYY-MM-DD`
  * **Place** → city/landmark (only when meaningful)
  * **Version** → `v2`, `revA`
  * **Duration** → `12m`
  * **Resolution** (video) → `1080p`
* **Length**: target 30–60 chars (user-configurable 40–80)
* **Fallback**: `YYYY-MM-DD-topic-short-hash`

### D) Formatting Rules

* Collapse repeated separators (`" -  - "` → `" - "`)
* Trim leading/trailing separators and spaces
* Preserve diacritics by default; **Setting**: "Transliterate to ASCII" (off by default)
* Keep extension intact; never add extra dots
* No camera/codec/model noise unless user enables "power user" mode

**Examples (Clean format)**

* PDF (residence permit): `Wniosek o przedłużenie zezwolenia na pobyt - 2025-09-15`
* Photo (geo): `Zachód słońca - Tatry - Morskie Oko - 2025-08-17`
* Screenshot (app): `Figma - Navbar fix - dialog`
* Meeting audio: `Waypass - Sprint planning - Q4 goals - 45m`
* Video tutorial: `Supabase - CORS dla Edge Functions - 1080p - 12m`
* Invoice: `Biedronka - Faktura - 2025-03-04 - 146,20 PLN`

**CLI-friendly versions (kebab-case)**

* `wniosek-o-przedluzenie-zezwolenia-na-pobyt-2025-09-15`
* `waypass-sprint-planning-q4-goals-45m`

**Data-friendly versions (snake_case)**

* `wniosek_o_przedluzenie_zezwolenia_na_pobyt_2025_09_15`
* `waypass_sprint_planning_q4_goals_45m`

## 10) Preferences & Controls

* **Mode**: Auto-rename / Confirm-before-apply
* **Per-type toggles**: PDFs, images, audio, video, archives
* **Filename language**: Browser UI language / Auto (detect from content) / specific language
* **Separator style**: Clean (spaces + dashes) / CLI-friendly (kebab-case) / Data-friendly (snake_case)
* **Use helpful metadata** (opt-in clarity):
  * **Geolocation (photos)**: Add meaningful location context
  * **Date from content**: Extract and use document dates
  * **Duration/Resolution (media)**: Include media specs when clarifying
  * **Source site hint**: Use domain/site context for naming
* **Hybrid AI routing**:
  * **Allow cloud assist**: Opt-in toggle (off by default); shows expected providers + privacy summary
  * **Cloud usage scope**: Per-type toggles (e.g., “Allow cloud for audio/video only”)
  * **Data minimization mode**: Strip sensitive entities before upload (on by default)
* **Character handling**:
  * **Transliterate to ASCII**: Convert diacritics (off by default)
  * **Max filename length**: 40–80 chars (default: 60)
* **Templates** (later): per type, e.g., "Photo: `{date}_{place}_{subject}`"
* **Revert & Edit**: quick undo; in-place edit with suggestions that teach preferences
* **Privacy**: "Strip where-from/source after rename"

## 11) Success Metrics

* **Quality**: ≥ 80% of renamed files rated “clear & useful.”
* **Time saved**: ≥ 50% reduction in manual renames over 2 weeks.
* **Adoption**: ≥ 70% users keep Auto-rename on after first week.
* **Trust**: < 5% revert rate on renamed items (opt-in telemetry).
* **Coverage**: 70–90% of eligible files get renamed (others intentionally kept).

## 12) Rollout

**MVP (Weeks 1–3)**

* PDFs (first 2–3 pages) + Images (screenshots, scans, photos w/ optional geo).
* Auto-rename + Revert; simple settings; language auto-detect.

**v1**

* Video (keyframes + short transcript), Audio (intro transcript), Archives/Installers.
* Confirm mode, per-type toggles, metadata switches.

**v2**

* Series awareness (foto1/2/3, part-1/2/3), user templates, bulk re-title, small “learning” from user edits.

## 13) Risks & Mitigations

* **Incorrect titles** → Confirm Mode toggle; easy revert; conservative threshold.
* **Privacy sensitivity (geo/URL)** → opt-in switches; clear labeling; local-only default.
* **Performance on large files** → cap inspection (pages/seconds/keyframes); cache per-domain/site hints; offload heavy cases to cloud only with consent.
* **Multilingual content** → language detection; keep UI language separate from filename language.
* **Edge cases (scans/handwriting/no speech)** → fallbacks and conservative “keep original” decisions.
* **Cloud fallback compliance** → document data-sharing terms, GDPR/CCPA alignment; ensure opt-in consent stored with timestamp.

## 14) Open Questions

* Should “Confirm Mode” be the default for legal/financial documents?
* Do we allow per-folder behaviors (e.g., “Work”, “Photos”, “Receipts”)?
* What telemetry do we need to assure users about local vs. cloud usage without logging sensitive content?
* ~~What's our default stance on diacritics (preserve vs. normalize) per OS?~~

  **Answer**: Preserve diacritics by default across all platforms (Windows NTFS, macOS HFS+/APFS, and modern Linux filesystems handle Unicode well). Provide optional "ASCII-safe mode" toggle for cross-platform sharing, legacy system compatibility, or command-line heavy workflows. This respects user language while offering technical escape hatches when needed.
