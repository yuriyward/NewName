# PRD — Technical Perspective (v2) — “NewName”

**Owner:** Yuriy Babyak
**Date:** 22 Sep 2025
**Platform:** Chrome Extension (MV3). Optional Desktop Helper (later).
**AI stack:** Chrome Built-in AI (Prompt / Summarizer / Language Detector). Optional cloud fallback via Firebase AI Logic (opt-in).

---

## 0) Goals (engineering)

* Instant Baseline rename via `downloads.onDeterminingFilename` using **deterministic user-selected strategies** (keep original, append date, or combine with page title); never infer semantic content at this stage.
* Carry Instant Baseline confidence + "why kept" metadata forward so the Contextual Upgrade stage knows which items need deeper inspection.
* Contextual Upgrade background **“upgrade”** using **text-first** PDF strategy; image/scan fallback; media keyframes.
* **Local-first** AI with explicit **cloud fallback**.
* **Undo/Upgrade** via **File System Access** one-time Downloads grant.
* Hard **filename safety** (chars/length/single dot).
* Minimal footprint, deterministic performance.

---

## 1) Architecture

### 1.1 Processes & responsibilities

* **Service Worker (SW)**

* Listens to downloads, produces an Instant Baseline decision (`rename` | `keep`) based on the configured deterministic strategy. Calls `suggest()` with the generated filename when the strategy returns a value; otherwise reuses the original name and flags the item for later upgrade.
  * Owns Settings, History, Telemetry (storage).
  * Launches/communicates with **Offscreen Document**.
* **Offscreen Document (OSD)** (hidden HTML page)

  * Hosts built-in AI sessions (Prompt/Summarizer/LanguageDetector).
  * Runs PDF.js (text extraction) and MuPDF WASM (raster for scans).
  * Performs Range fetches for first pages/keyframes.
  * Returns upgraded names + “reason tags” + confidence.
* **UI Surfaces**

  * **Popup**, **Settings**, **Confirm Modal** (in extension pages).
  * **Toasts/Notifications** (Chrome/HTML in popup).

### 1.2 Messaging

* SW ↔ OSD via `@webext-core/messaging` (typed protocol on top of runtime messaging).
* Background-only logic is exposed through `@webext-core/proxy-service` (e.g. page-context state access).
* Message types (TypeScript discriminated unions):

```ts
type Msg =
  | { t:'OSD_INIT' }
  | { t:'PHASE2_REQUEST'; id:string; url:string; fileType:FileType; hints:Phase1Hints; cfg:Phase2Cfg }
  | { t:'PHASE2_RESULT'; id:string; result:Phase2Result }
  | { t:'AI_STATUS_QUERY' } | { t:'AI_STATUS' ; status:AiStatus }
  | { t:'FS_REQUEST_HANDLE'; path:string }
  | { t:'FS_MOVE'; path:string; newName:string }
  | { t:'ERROR'; id?:string; code:string; detail?:unknown };
```

---

## 2) Permissions & manifest

### 2.1 `manifest.json` (key parts)

```json
{
  "manifest_version": 3,
  "name": "NewName",
  "version": "0.1.0",
  "minimum_chrome_version": "138",
  "permissions": [
    "downloads", "storage", "offscreen", "notifications"
  ],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "sw.js", "type": "module" },
  "action": { "default_popup": "popup/index.html" },
  "options_ui": { "page": "settings/index.html", "open_in_tab": true },
  "icons": { "16":"icons/16.png", "32":"icons/32.png", "128":"icons/128.png" }
}
```

> Note: `<all_urls>` can be narrowed later; needed for Contextual Upgrade **Range** re-fetch of originals.

### 2.2 Offscreen doc creation

```ts
async function ensureOffscreen() {
  const url = chrome.runtime.getURL('offscreen/index.html');
  const has = await chrome.offscreen.hasDocument?.();
  if (!has) {
    await chrome.offscreen.createDocument({
      url, reasons: ['BLOBS','DOM_PARSER','IFRAME_SCRIPTING'],
      justification: 'Run built-in AI + PDF parsing for Contextual Upgrade processing'
    });
  }
}
```

---

## 3) Data models

### 3.1 Settings (MV3 `storage.local`)

```ts
type Mode = 'balanced'|'silent'|'careful'|'custom';
type Sep = 'clean'|'kebab'|'snake';
type FileType = 'pdf'|'image'|'audio'|'video'|'archive'|'data';
type Phase1Strategy = 'keep-original'|'original-with-date'|'page-title'|'page-title-with-date';

interface SettingsV1 {
  version: 1;
  mode: Mode;
  language: 'browser'|'auto'|'pl'|'en'|'uk';
  separator: Sep;
  maxLen: number; // 40..80 (default 60)
  transliterateAscii: boolean;
  phase1Strategy: Phase1Strategy;
  perType: Record<FileType,{behavior:'auto'|'confirm'|'off'}>;
  metadataToggles: { geo:boolean; docDate:boolean; mediaSpecs:boolean; sourceHint:boolean; };
  cloud: { enabled:boolean; scope: FileType[]; dataMinimize:boolean; };
  notifyOnKeep: boolean;
}
```

### 3.2 History (bounded ring, default 50)

```ts
interface HistoryItem {
  id: string;
  ts: number;
  path: string;        // display path
  original: string;
  final: string;
  source: 'on-device'|'cloud'|'metadata';
  fileType: FileType;
  phase: 1|2;
  reasonTags: string[]; // Title/Date/Geo/Source/Language
  undone?: boolean;
}
```

### 3.3 Contextual Upgrade request/response

```ts
interface Phase1Hints { domain:string; url:string; title?:string; mime?:string; ts:number; }
interface Phase1Decision {
  outcome: 'rename'|'keep';
  strategy: Phase1Strategy;
  confidence: 0|100;
  guardrail: 'strategy-applied'|'strategy-unavailable';
  reasons: string[];
}
interface Phase2Cfg { langPref:SettingsV1['language']; maxLen:number; sep:Sep; meta:SettingsV1['metadataToggles']; cloud:boolean; scope: FileType[]; }
interface Candidate { name:string; confidence:number; reason:string[]; }
interface Phase2Result { best?:Candidate; alts?:Candidate[]; source:'on-device'|'cloud'|'metadata'; elapsedMs:number; }
```

---

## 4) Instant Baseline pipeline

### 4.1 Trigger

`chrome.downloads.onDeterminingFilename.addListener(async (item, suggest) => { ... })`

### 4.2 Signals

* Original download metadata: `item.filename`, detected extension, parent path.
* Timing: `item.startTime` → canonical `YYYY-MM-DD` when available.
* Page context: `document.title` (content script snapshot). No heuristics or NLP derivation.
* User preferences: separator, transliteration, and selected `phase1Strategy`.

### 4.3 Deterministic strategies

The service worker resolves the configured strategy and produces a safe filename using the Filename Policy (section 7).

* `keep-original`: leave the download untouched; the Instant Baseline stage emits a `keep` decision with guardrail `strategy-unavailable`.
* `original-with-date`: sanitize the original basename and append the ISO date from `startTime`. If a date is missing, fall back to the original filename.
* `page-title`: sanitize the page title. If no title is available, fall back to the original filename.
* `page-title-with-date`: combine the sanitized page title with the ISO date. Missing inputs degrade to the best available deterministic data (title only, or original name).

All variants share the same post-processing: apply separator preference, enforce safe characters, and cap length via `maxLen`.

### 4.4 Suggest and log

* When the strategy yields a filename, the Instant Baseline stage responds with `suggest({ filename })` and records `guardrail:'strategy-applied'`.
* When the strategy cannot produce additional data, the Instant Baseline stage reuses `item.filename`, records `guardrail:'strategy-unavailable'`, and marks the item for the optional Contextual Upgrade stage.
* History captures the selected strategy, final filename (if any), and deterministic decision metadata.

---

## 5) Contextual Upgrade (background upgrade)

### 5.1 Capability check

* **Built-in AI availability**: `ai.langchain/ai.prompt.capabilities()` or equivalent status;
* **Summarizer/Language Detector sessions** pre-initialized during onboarding.

### 5.2 Extraction scope & realistic expectations

**Contextual Upgrade focuses on reliably extractable information:**
* **✅ Achievable**: Vendor/company names, document types (invoice, report, etc.), dates, language detection
* **✅ Achievable**: Basic content structure (titles, headings, main topic)
* **✅ Achievable**: App/window names from screenshots, EXIF location data from photos
* **❌ Out of scope**: Precise monetary amounts, detailed financial data, complex calculations
* **❌ Out of scope**: Deep semantic content analysis, full document comprehension
* **❌ Out of scope**: Reverse geocoding, external API dependencies

**Example realistic output**: `Biedronka - Faktura - 2025-03-04` (not `Biedronka - Faktura - 2025-03-04 - 146,20 PLN`)

### 5.3 Source access strategy

* Prefer **re-fetch** of the original URL with `Range:` header to pull only early bytes:

  * **PDF**: first 1–5 pages.
  * **Images**: first \~128–256 KB (enough for EXIF).
  * **Audio/Video**: initial keyframe/short audio segment.
* If server doesn’t support Range or requires auth, fallback to minimal full fetch (size guards).

### 5.3 PDF logic

* **Born-digital path** (default):

  * PDF.js streaming: extract text blocks from pages 1–3.
  * Send to **Summarizer(type:'headline')** with language hint.
* **Scan path** (fallback when low/no text):

  * MuPDF WASM rasterize pages 1–2 → downscale long edge to 1024–1536 px.
  * Either **Prompt(image input)** for caption→title, or **OCR (Tesseract.js)** → Summarizer.
* Return **candidates** with reason tags (Title/Date/Issuer/Language).

### 5.5 Image/Photo

* If screenshot → OCR small crop areas to find window/app title.
* Photos → read EXIF GPS; reverse-geocode is **out of scope**; use city/landmark only if embedded or hinted by filename/URL.

### 5.6 Audio/Video

* Extract 1–2 **keyframes** (video) and a **short intro audio** slice; pass to Prompt multimodal for class (meeting/tutorial/call).
* For duration/resolution, read container metadata if accessible without full download.

### 5.7 Scoring & compare

* Compute **score** = weighted sum (ContentTitle, DocType, MetadataHelpfulness, SourceClarity) minus (ExistingNameQuality, Ambiguity).
* Use `phase1Decision.confidence` as the baseline; when the Instant Baseline stage kept the original, treat the baseline as 0 but carry through `decision.reasons` to inform messaging.
* If `best.score - baseline >= delta` (e.g., +10) → surface **Upgrade**.

### 5.7 Post-save rename

* Requires **Downloads** folder handle (see §6).
* `move()` to the new name atomically when user taps **Apply**.

---

## 6) File System Access (Undo/Upgrade)

### 6.1 Onboarding grant

* Button triggers `showDirectoryPicker({ startIn:'downloads' })`; store **origin-private** `FileSystemDirectoryHandle` via `storage` (using `navigator.storage.getDirectory()` + OPFS bookmark if preferred).

### 6.2 Operations

* **Undo**: move current file to `original`.
* **Upgrade**: move to upgraded `candidate.name`.
* Handle busy file (`DOMException: NoModificationAllowedError`) with retry queue (3 attempts, 30s).

---

## 7) Filename Policy (hard guardrails)

* **Allowed**: letters, digits, space, `-`, `_`, exactly one `.` before extension.
* **Prohibited**: `: * ? " < > | \ /` and extra dots.
* Trim spaces, collapse multiple separators.
* **Length**: target 30–60; hard cap `maxLen` from Settings.
* **Order**: `Subject` → Qualifiers (date `YYYY-MM-DD`, place, version, duration/resolution).
* **Diacritics**: preserve; optional transliteration.

### 7.1 Enforce with structured output (Prompt)

* Use Prompt API `responseConstraint` JSON Schema to **force** a safe object:

```json
{
  "type": "object",
  "properties": { "name": { "type":"string", "maxLength": 80 } },
  "required": ["name"]
}
```

* Post-validate: strip/replace illegal chars; ensure single dot.

---

## 8) Cloud fallback (opt-in)

* Provider: **Firebase AI Logic**.
* Modes: `prefer_on_device` (default if enabled) / `only_on_device` / `only_in_cloud`.
* Payloads: **snippets only**, never raw files; redact numbers that look like personal IDs/IBAN/CC by heuristic when toggled.
* Surface badges “Cloud assist” + provider name in UI.

---

## 9) Privacy, security, compliance

* Default **on-device** processing; cloud requires explicit toggle + per-type scope.
* Store **no content**; only minimal anonymous counters if telemetry is enabled.
* History kept locally; provide **Clear History**.
* Respect **CSP** in extension pages; no remote script.
* Handle **auth cookies** correctly for Range re-fetch (host permissions).
* Do not write EXIF/PII into filenames if user disabled respective metadata.

---

## 10) Performance budgets

* **Instant Baseline** decision (strategy evaluation + `suggest()`) ≤ **120 ms** (p95).
* **Contextual Upgrade** offscreen processing ≤ **6 s** (p95) for PDFs; ≤ **3 s** for images; ≤ **8 s** for media.
* **Prompt/Summarizer** invocations: p95 ≤ **800 ms** on supported hardware, else fall back.
* Memory: OSD < **180 MB** peak with MuPDF; lazy-load WASM only on scan path.

---

## 11) Error handling & fallbacks

* Built-in AI unavailable → **Metadata-only mode** + UI banner.
* Instant Baseline strategy unavailable (missing title/date) → keep original name, mark for upgrade, show "Kept original" toast.
* User didn’t grant Downloads access → Disable Upgrade/Undo, show lock icon + CTA.
* Range not supported → bounded full fetch (size threshold), else skip Contextual Upgrade.
* Rename conflicts → incremental suffix `- 2`, `- 3`, …
* Busy file/in-use → retry queue with exponential backoff.
* Timeouts → keep the Instant Baseline name; surface “took too long”.

---

## 12) Testing plan

### 12.1 Unit

* Filename policy sanitization & length trimming.
* Strategy outputs (original/date/title combinations) across locales and separators.
* Filename policy sanitization for page-title derived names.

### 12.2 Integration

* SW ↔ OSD messaging, including concurrent Contextual Upgrade requests.
* Offscreen PDF.js text extraction on varied PDFs (digital vs scan).
* MuPDF raster path (WASM loaded on demand).
* File System Access `move()` success/failure paths.

### 12.3 E2E (Playwright)

* Simulate downloads across file types, verify Instant Baseline names.
* Trigger Contextual Upgrade results; accept/decline Upgrade; Undo flows.
* Toggle cloud assist and verify badge/behavior.
* Permissions: first-run onboarding; missing permissions edge cases.

### 12.4 Performance

* Measure p95 timings with Chrome Tracing on mid-tier hardware.
* Memory snapshot on heavy PDFs.

---

## 13) Telemetry (opt-in)

* Counters only (no content):

  * Renamed vs Kept (by type).
  * Revert rate, edit rate.
  * Contextual Upgrade offers & acceptance.
  * Cloud assist usage (counts).
* Local logs exportable for support.

---

## 14) i18n & locales

* UI strings in PL/EN/UK JSON bundles.
* Filename language: `browser` / `auto` / fixed; auto via Language Detector.
* Bidi & diacritics tests; optional translit.

---

## 15) Rollout checklist

* ✅ MVP: Instant Baseline coverage for PDFs + Images; Contextual Upgrade text-first for PDFs; MuPDF fallback; Undo/Upgrade with FS Access; basic Settings & History; on-device only.
* 🔜 v1: Audio/Video; Confirm Modal; per-type cloud scope; series awareness.
* 🔜 v2: Batch Review; per-folder rules; templates; desktop helper.

---

## 16) Risks & mitigations

* **AI latency/availability** → strict budgets, metadata-only fallback.
* **Licensing** (MuPDF AGPL/commercial) → keep raster path optional; allow PDF.js-only build.
* **Range re-fetch blocked** → bounded full fetch or skip Contextual Upgrade for that item.
* **User rejects Downloads access** → app still useful; Upgrade/Undo disabled gracefully.
* **False positives on sensitive data** → conservative redaction; allow user to disable.
