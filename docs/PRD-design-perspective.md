# PRD — Design Perspective (v2) — “NewName”

**Owner:** Yuriy Babyak
**Date:** 22 Sep 2025
**Platform:** Chrome Extension (MV3). Offscreen document hosts AI. Optional desktop helper later.

---

## 1) Product personality & UX principles

**Personality:** Invisible, competent, privacy-forward.
**Tone:** concise, friendly, non-cute.

**UX principles**

1. **Instant value, zero drag** — the Instant Baseline rename never blocks the download longer than necessary.
2. **Upgrade, don’t nag** — Contextual Upgrade suggestions appear briefly and are easy to accept, ignore, or undo.
3. **Trust at a glance** — clear “On-device” vs “Cloud assist” badges; reason tags (Title/Date/Geo).
4. **Deterministic safety** — filenames are validated inline; we never propose unsafe chars or double dots.
5. **Respect agency** — Undo everywhere, per-type controls, explicit cloud consent.

Sample copy:

* “Renamed (On-device) to **Wniosek o…**”
* “Kept original name — already clear.”
* “✨ Found better name: **Supabase — CORS dla Edge Functions** • Apply • Details”

---

## 2) Information Architecture

**Primary surfaces**

1. **First-Run / Onboarding** (mode + permissions + AI session activation)
2. **Rename Toast** (Instant Baseline results; one-click Undo)
3. **Upgrade Notification** (Contextual Upgrade suggestion with reasoning)
4. **Confirm Modal** (Careful mode & sensitive docs)
5. **Extension Popup** (status + quick actions)
6. **Settings Page** (full preferences)
7. **History Panel** (recent actions + Undo/Redo/Edit)

**Runtime note (for design):** an **Offscreen Document** hosts Summarizer/Prompt/Language Detector, PDF.js/MuPDF, OCR. Service worker messages it. This affects where spinners/badges read “On-device” vs “Cloud assist”.

---

## 3) First-run & Onboarding (updated)

**Screen 1 — Mode**

* Title: “Name files like a human.”
* Cards:

  * **🔄 Balanced (Rec.)** — Auto-rename + toasts; confirm legal/financial.
  * **🔇 Silent** — Auto-rename everything, no notifications; see History.
  * **🛡️ Careful** — Always confirm before renaming.
  * **⚙️ Custom** — Tune everything (reveals advanced).
* Advanced (when **Custom**):
  Filename language (Auto/PL/EN/UK…), Separator (Clean/kebab/snake), Metadata toggles (Geo/Date/Source/Duration).
* Primary: **Continue**

**Screen 2 — Privacy & Cloud**

* Headline: “Stay on device or allow cloud assist?”
* Toggle (off by default): **Allow cloud assist when needed**

  * Per-type checkboxes: PDFs / Images / Audio / Video / Archives
  * Small disclosure link “How we protect your data”
* Primary: **Continue** · Secondary: **Keep on-device only**

**Screen 3 — Enable post-save controls**

* Headline: “Enable Undo & Upgrade after save”
* Text: “Grant Downloads folder access so we can safely rename or revert later.”
* Button: **Grant access** (invokes File System Access picker)
* Small alternate: “Skip for now (Undo/Upgrade limited)”

**Screen 4 — Activate on-device AI**

* Headline: “Optimize on-device intelligence”
* Action buttons (require user gesture):

  * **Enable Summarizer** (init session; shows small check on success)
  * **Enable Language Detection** (init session)
* Status line if model download starts: “Setting up on-device AI (runs in background).”
* Primary: **Start using**

**Empty state**
“Ready! New files will be named automatically. Undo anytime.”

---

## 4) Mode-based flows

### 4.1 Balanced (default)

* Instant Baseline stage auto-renames + toast.
* Sensitive docs (auto-detected) go through Confirm Modal.
* Contextual Upgrade surface shows Upgrade Notification with reason tags.

### 4.2 Silent

* No toasts; quiet auto-apply.
* Contextual Upgrade stage: only auto-apply when **High confidence**, log the rest to History.
* Badge in History indicates “Auto-applied (Silent).”

### 4.3 Careful

* Always show Confirm Modal before any rename.
* Contextual Upgrade suggestions also open the Confirm Modal, not a toast.

### 4.4 Deterministic Auto-rename (All modes)

* Trigger: download starts.
* **Instant Baseline stage**: apply the configured deterministic strategy (keep original, original + download date, page title, or page title + date). Missing inputs automatically fall back to the original filename, and toasts reflect the outcome per mode.
* **Contextual Upgrade stage** (offscreen): text-first for PDFs (Summarizer “headline”); image/scan fallback (MuPDF raster → Prompt image or OCR); keyframe+audio for media; Language Detector if Auto language.

---

## 5) UI Patterns (updated)

### 5.1 Rename Toast (Instant Baseline)

* Location: bottom-right (desktop).
* Content:

  * Icon + “Renamed (**On-device**) to **{name}**”
  * Badges (if applicable): **🇵🇱 PL**, **Clean/kebab/snake** chip
* Actions: **Undo**, **Edit name…**, **Details**
* Auto-dismiss 8–10s; hover to persist; accessible via History.

**Kept toast (optional if enabled)**

* “Kept original name — already clear.”

### 5.2 Upgrade Notification (Contextual Upgrade)

* Icon: ✨
* Before/After: `Original.pdf` → **New name**
* **Confidence**: High / Suggested / Alternative
* **Reason tags**: **Title**, **Date**, **Geo**, **Source**, **Language**
* Actions: **Apply** (primary), **Details**, **Not now**, “Always apply for \[type/site]”

**Details drawer**

* Mini preview: first-page title / detected issuer / excerpt (if text path)
* Why this name (one-liner), processing source badge: **On-device** / **Cloud assist**

### 5.3 Confirm Modal

* Banner (if triggered automatically): “⚠️ Legal/financial document detected — confirming for safety.”
* Fields:

  * Proposed name (editable text field)
  * Small helper: “Aim for 30–60 characters. We’ll keep the extension.”
  * Language selector (“Detected: Polski 🇵🇱” with override)
* Reason tags (hover for explanations).
* Actions: **Rename** (primary), **Keep original**, **Show alternatives** (1–2 more)
* Footer link: “Always auto-apply for this type” (sets per-type rule)

### 5.4 Extension Popup

* **Instant Baseline strategy selector** (radio list covering the four deterministic options with brief explanations).
* **Status hint**: Copy reminding users that the Instant Baseline stage stays deterministic and that richer upgrades live in the Contextual Upgrade stage.
* **Save feedback**: Inline “Saving…” / “Saved” microcopy; errors surface inline when storage fails.
* Future quick actions (Rename current file, Undo, History) migrate to a dedicated settings view once the deterministic baseline matures.

### 5.5 Settings Page

**General**

* Mode cards (as onboarding)
* Max filename length slider (40–80, default 60)
* Transliterate to ASCII (toggle)
* Cloud assist toggle + disclosure

**Language & Format**

* Filename language (Browser/Auto/PL/EN/UK…)
* Separator: Clean / kebab / snake
* Live example preview (type to see formatted output)

**Metadata usage**

* Use photo location (adds city/landmark when helpful)
* Use document date from content
* Add duration/resolution to media
* Use source site hint

**Per-type behavior**

* Cards: PDFs/Docs, Images, Audio, Video, Archives, Data/Code
* Each: Auto-rename | Confirm | Off
* Cloud status pill when applicable

**History & Safety**

* Recent items (search/filter: All/Renamed/Kept/Undone)
* Actions per row: Undo, Redo, Edit, Copy name
* Source badge: **On-device** / **Cloud assist**
* **Clear local logs**, **Export/Import settings**

**Diagnostics**

* On-device model status (Available / Downloading % / Unavailable)
* Space hints if needed
* Error log viewer (collapsed)

---

## 6) Micro-interactions & Copy (expanded)

**Background processing (offscreen)**

* “🧠 Analyzing first pages…”
* “📖 Reading document structure…”
* “🌍 Detecting language…”
* “⚡ Almost ready with upgrade…”
* “☁️ Using cloud assist (per your settings)…”

**AI outcomes**

* High confidence: “✨ Found better name: **{name}**”
* Moderate: “🔄 Suggested improvement: **{name}**”
* Alternative: “💡 Another option: **{name}**”
* Applied: “✅ Applied smarter name: **{name}**”
* Learning: “📚 Thanks — we’ll remember this preference.”

**Error & fallback**

* Model unavailable: “On-device model not ready — using Metadata-only mode.”
* Timeout: “Taking longer than expected — saved with basic name.”
* Rename blocked (in use): “File is busy — we’ll retry shortly.”
* Permission missing (post-save): “Grant Downloads access to enable Undo & Upgrade.”

---

## 7) States & Edge Cases

**Model & activation**

* If Summarizer/Language Detector require activation: show inline prompt in popup/settings: “Enable on-device {feature}”.
* “Downloading on-device model… XX%” with non-blocking progress.

**Metadata-only Mode (explicit design)**

* Screenshot → `Screenshot — 2025-09-22 — 1080p`
* PDF from GitHub → `Document — github.com — 2025-09-22`
* Image download → `Image — reddit.com — 2025-09-22 — 2MB`

**File conflicts**

* If name exists, auto suffix “- 2”, “- 3”, etc.; show conflict resolution hint in Confirm.

**Restricted chars/length**

* Inline validation; auto-clean preview: “Will become: safe-filename-v2”

**Sensitive content**

* Extra confirmation for patterns like account numbers;
* Option: “Exclude sensitive tokens from filename”;
* If cloud assist is on, show: “Sensitive content will not leave your device” and disable cloud routing for this item.

**No Downloads permission**

* The Instant Baseline stage still works; **Upgrade** button shows a small lock with tooltip: “Grant access to enable post-save renames.”

---

## 8) Accessibility & i18n

* **Keyboard**

  * Undo last: `Alt+Ctrl+Z`
  * Edit last: `Alt+Ctrl+R`
  * Open popup: `Alt+Ctrl+N`
* **Screen readers**: toasts `role="status"`, buttons with descriptive labels.
* **Reduced motion / high contrast** respected.
* **RTL & diacritics**: filenames render correctly; test bidi separators.

---

## 9) Visual Style

* **Type:** system font; 14–15px popup, 16px settings.
* **Color:** neutral UI; success green for rename, amber for warnings/kept.
* **Shadows:** light, unobtrusive.
* **Icons:** simple line icons per file type + source badges.
* **Spacing:** 8px grid; dense in popup, roomy in settings.

---

## 10) Roadmap (UX)

**MVP**

* Onboarding (Mode, Cloud, Downloads access, AI activation)
* Instant Baseline toasts; basic History (50 items)
* Settings (General, Language/Format, Per-type)
* Contextual Upgrade notification (PDFs + Images)

**v1**

* Confirm Modal; richer History filters; Series awareness
* Metadata toggles UI; Cloud fallback per type
* Live example preview in Settings

**v2**

* Batch Review panel (multi-file)
* Per-folder behaviors & template builder
* Desktop helper status drawer

---

## 11) Example Journeys

**A. Hands-off pro (Balanced)**

* Installs → chooses **Balanced** → grants Downloads → enables AI → downloads an invoice
* Toast: "Renamed (On-device) to **Biedronka — Faktura — 2025-03-04**" → Undo available.
* Later: ✨ Upgrade available on a PDF → Apply.

**B. Power user (Silent)**

* Chooses **Silent**, cloud off → saves 30 screenshots → all renamed quietly.
* Checks **History**: sees names + source badges, can Edit/Undo.

**C. Careful reviewer**

* Chooses **Careful** → Confirm Modal appears for every file.
* Edits suggestions → sets “Always apply for PDFs from this site.”

---

### Designer handoffs

* Component specs: Toast, Upgrade card, Confirm modal, History rows, Badges.
* Empty/error states for: model unavailable, permission missing, network fail.
* Strings in i18n bundles for PL/EN/UK (with placeholders for {name}, {date}, etc.).
* Icon set for file types + processing source (On-device/Cloud).
