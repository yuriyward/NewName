# PRD - Design Perspective — “NewName”

**Owner:** Yuriy Babyak
**Date:** 22 Sep 2025
**Platforms:** Chrome extension

## 1) Product personality & UX principles

* **Invisible helper**: acts automatically, interrupts only when confidence is low or the user asked to confirm.
* **Human-first clarity**: names are short, readable, localized.
* **Control without clutter**: quick revert, clear settings, smart defaults.
* **Privacy-forward**: visible cues when metadata (e.g., geolocation) influences naming and whether processing stayed on-device.

Tone of voice: concise, friendly, non-cute.
Examples: “Renamed (On-device) to: **Wniosek o…**” / “Kept original name—already clear.”

---

## 2) Information architecture

**Primary UI surfaces**

1. **Extension Popup** (quick actions)
2. **Settings Page** (full preferences)
3. **Rename Review** (optional confirm flow)
4. **Rename Toast** (inline success/undo)
5. **History** (recent actions + revert)
6. **First-Run / Onboarding** (model download + choices)

Optional (if you add desktop helper later): **Helper Status Drawer**.

---

## 3) First-run & onboarding

### 3.1 First-run modal (one-time)

* **Screen 1: Welcome & Mode Selection**

  * Title: "Name files like a human."
  * Bullets: Smart by default, full transparency, quick undo.
  * **Choose your mode** (radio cards with descriptions):
    * **🔄 Balanced (Recommended)**: Auto-rename with notifications, confirm sensitive docs
    * **🔇 Silent**: Auto-rename everything quietly, no popups or notifications
    * **🛡️ Careful**: Always confirm before renaming, maximum control
    * **⚙️ Custom**: Set your own rules (expands advanced options below)
  * **Advanced options** (shown only if Custom selected):
    * **Filename language**: Auto-detect / Polski / English / Українська…
    * **Separator style**: Clean / kebab-case / snake_case
    * **Smart metadata**: location, dates, source context (toggles)
  * Primary: **Get Started**
* **Screen 2: Processing Preference**

  * Headline: "Stay on device or allow cloud assist?"
  * Copy: “We default to private, on-device naming. You can enable cloud fallback for better coverage when your device can’t process locally.”
  * Controls:
    * Toggle **"Allow cloud assist when needed"** (off by default) with tooltip summarizing provider (Firebase AI Logic → Gemini) and data minimization.
    * Checkbox list per file type (disabled until toggle on): PDFs, Images, Audio, Video, Archives.
    * Link: “Learn more about how we protect your data.”
  * Primary: **Continue**; secondary: **Keep on-device only**.
* **Screen 3: Ready & Model Setup**

  * "You're all set! Settings can be changed anytime."
  * If model downloading: Progress bar "Setting up intelligence..." (doesn't block, works in background)
  * If ready: "Ready to rename your files intelligently."
  * Primary: **Start Using**
* Final note: “You can change everything later in Settings.”

### Empty-state copy examples

* “Ready! New files will be named automatically. Undo anytime.”

---

## 4) Mode-based flows

### 4.1 Balanced Mode (default)

**Behavior**: Auto-rename most files + toast notifications + auto-confirm sensitive docs

### 4.2 Silent Mode

**Behavior**: Auto-rename everything + no notifications + history tracking only

### 4.3 Careful Mode

**Behavior**: Always confirm before renaming + detailed review modals

### 4.4 Auto-rename flow (Balanced & Silent modes)

**Trigger**: Browser finishes a download / user saves a file.

**Steps (behind the scenes)**

1. Quick triage → build context → generate title.
2. If score ≥ threshold → rename. Else keep original.

**User feedback**

* **Balanced Mode**: Show rename toasts as below
* **Silent Mode**: No toasts, add to history silently

* **Rename toast (bottom-right, Balanced mode only)**

  * Icon + text: "Renamed (On-device) to **Figma - Navbar fix - dialog**"; if cloud assist used, display "Renamed (Cloud assist) to …" with shield icon.
  * Language indicator (when auto-detected): small "🇵🇱" or "EN" badge
  * Actions: **Undo**, **Edit name…**, **Details**
  * Auto-dismiss (8–10s), hover to persist, accessible via History.

* **Kept name toast (Balanced mode, if user enabled "Notify on keep")**

  * "Kept original name — looks good."

**Undo behavior**

* One click **Undo** restores original name; toast updates to “Restored original name.”

### 4.5 Confirm flow (Careful mode + Balanced mode for sensitive docs)

**Trigger**:
- **Careful Mode**: ALL files trigger confirmation
- **Balanced Mode**: Only auto-detected legal/financial content (invoices, contracts, permits, tax forms, certificates)
- **Silent Mode**: Never confirms, auto-renames everything
- **Custom Mode**: Based on user settings

**Auto-detection indicators**: Document keywords ("faktura", "umowa", "invoice", "contract"), formal letterheads, government forms, financial amounts/account numbers on first pages.

**Rename Review modal**

* Preview icon + filetype chip (PDF/Image/Video/Audio) + **sensitive doc badge** if auto-detected
* Banner (if auto-triggered): "⚠️ Legal/financial document detected - confirming for safety"
* Language selector dropdown (when auto-detect is ON): "Detected: Polski 🇵🇱" with override options
* Proposed name (editable text field)
* Subtext: brief rationale (1 line): "Found form title on page 1; added date from document."
* Small pill tags showing used hints: **Title**, **Date on page**, **Geolocation** (hover explains)
* Actions:

  * **Rename** (primary)
  * **Keep original**
  * **Show alternatives** (dropdown of 1–2 other candidates)
* Link: "Always auto-apply for this type" (sets per-type preference)

### 4.3 Batch review (optional later)

When multiple files land together (e.g., 10 images), a **Review panel** slides in with a list:

* Each row: thumbnail, proposed name, single-click approve/keep.
* “Approve all” + “Keep all” + “Select all”.

---

## 5) Extension popup (compact control center)

**Sections**

* **Status**

  * Current mode badge: "🔄 Balanced" / "🔇 Silent" / "🛡️ Careful" / "⚙️ Custom"
  * Last action: "Renamed (On-device): **…** · Undo" or "Renamed (Cloud assist): **…** · Undo"
  * Processing chip showing current routing: **On-device** / **Cloud assist paused** / **Cloud assist active** (tap to manage).
* **Quick actions**

  * **Rename current file** (if on a file tab or selected download)
  * **Revert last**
  * **Open History**
* **Shortcuts**

  * “Temporarily pause (30 min)”
* **Footer**

  * **Settings** ⚙️  |  “What’s new”

**Design**
Clean list; use platform font; 320–380 px width; icons for filetypes.

---

## 6) Settings page (full preferences)

### 6.1 General

* **Mode** \[radio cards]:
  * **🔄 Balanced**: Auto-rename + toast notifications + confirm sensitive docs
  * **🔇 Silent**: Auto-rename everything + no notifications + history tracking only
  * **🛡️ Careful**: Confirm all renames + detailed review modals
  * **⚙️ Custom**: Manual control over all settings below
* **Max filename length** \[slider 40–80, default 60]
* **Transliterate to ASCII** \[toggle] (off by default)
* **Allow cloud assist when on-device fails** \[toggle] (off by default) + inline provider disclosure

### 6.1.1 Custom Mode Settings (shown only when Custom selected)

* **Auto-rename** \[toggle]
* **Confirm mode** \[toggle] (+ checkbox "Default for legal/finance docs")
* **Toast notifications** \[toggle]
* **Notify when keeping original** \[toggle]
* **Cloud assist scope** \[chips]: PDFs / Images / Audio / Video / Archives (visible when cloud assist enabled)

### 6.2 Language & format

* **Filename language** \[dropdown: Browser default / Auto / PL / EN / UK / …]
* **Separator style** \[radio: Clean / kebab-case / snake\_case]
* **Examples** live-preview: type sample → see formatted output

### 6.3 Metadata usage

* **Use photo location** \[toggle, default ON] (subtitle: "adds city/landmark when helpful")
* **Use source site hint** \[toggle, default ON]
* **Use document date from content** \[toggle, default ON]
* **Add duration/resolution to media** \[toggle, default ON]
* (Tooltips explain privacy: local-only by default)

### 6.4 Per-type behavior

Cards: **PDF/Docs**, **Images**, **Audio**, **Video**, **Archives**, **Data/Code**
Each card: \[Auto-rename | Confirm | Off], plus small per-type notes:

* PDFs: “Inspect first 2–5 pages.”
* Images: “OCR for screenshots; add place when helpful.”
* Audio/Video: “Brief intro transcript only.”
* Archives: “Top folder / product + count.”
* Data/Code: “Dataset size / project name\@version.”
* Cloud status pill when applicable: “On-device only” / “Cloud fallback allowed”.

### 6.5 History & safety

* **Recent items** (list with search/filter)

  * Row: thumbnail/emoji, final name, original name (small), date/time, actions: Undo / Redo / Edit
  * Processing source badge: "On-device" / "Cloud assist"
* **Clear local logs** \[button] (confirm)
* **Export settings** / **Import settings**

### 6.6 About / Diagnostics

* Model status (On-device available / downloading % / unavailable)
* Disk space hint if needed
* Optional error log viewer (collapsed)

---

## 7) History (standalone panel)

* Filter by: **All / Renamed / Kept / Undone**
* Search input (fuzzy)
* Rows show:

  * Icon/thumbnail
  * Final name (bold) + language badge if auto-detected
  * Original name (muted)
  * Chips for hints: Title / Geo / Date / Duration / Source / Language (if auto-detected)
  * Actions: **Undo**, **Edit**, **Copy name**
* Bulk actions (multi-select): Undo selected

Empty state: “No recent items. New files will appear here.”

---

## 8) Micro-interactions & copy

**Rename toast**

* Success: “Renamed to **{name}**” · **Undo** · **Edit name…**
* Kept: “Kept original name — already clear.”

**Confirm modal**

* Title: “Review filename”
* Field placeholder: “Enter a short, clear name”
* Helper text: “Aim for 30–60 characters. We’ll keep the extension.”

**Settings hints**

* “Auto-rename” → “Rename new files automatically using content and helpful metadata.”
* “Confirm mode” → “Ask before renaming; ideal for sensitive documents.”
* “Use photo location” → “Adds city/landmark—never shares your exact GPS.”

---

## 9) States & edge cases

### 9.1 Model & System States

* **Model unavailable / not downloaded**

  * Banner in popup: "On-device model not ready."
  * Button: **Set up now…** → opens model setup section in Settings.
  * Fallback behavior: keep original names; show gentle notice after first event.
  * **Metadata-only mode available**: Uses only file metadata (date, source domain, file type, size) without content analysis
  * If cloud assist enabled and network available: auto-route to cloud after user consent reminder; toast clarifies "Used cloud assist while model downloads."

* **Model download failed**

  * Error toast: "⚠️ Setup failed. Check network connection."
  * Actions: **Retry**, **Use metadata-only mode** (date, source, file type patterns), **Temporarily allow cloud assist** (if not already enabled)
  * Settings shows offline fallback options

**Metadata-only Mode Examples (when AI model unavailable):**
- Screenshot → `Screenshot - 2025-09-22 - 1080p`
- PDF from GitHub → `Document - github.com - 2025-09-22`
- Image download → `Image - reddit.com - 2025-09-22 - 2MB`
- Generic file → `Document - domain.com - 2025-09-22`

* **Network issues during download**

  * Progress bar shows "Paused - network issue"
  * Auto-retry with backoff; manual retry button
  * Graceful degradation to cached partial model if available
  * Cloud assist banner warns when offline fallback is disabled and suggests enabling metadata-only mode.

### 9.2 File Operation Errors

* **File permission errors**

  * Error toast: "⚠️ Can't rename - file is read-only or in use"
  * Actions: **Retry**, **Skip**, **Copy suggested name** (to clipboard)
  * Queue for retry when file becomes available

* **File locked / in use**

  * Background retry logic (3 attempts over 30s)
  * Toast: "File is busy - will retry automatically"
  * User can manually trigger retry from History

* **Disk space issues**

  * Warning before model download: "Need 250MB free space"
  * Error during download: "Download paused - insufficient space"
  * Cleanup suggestions: clear browser cache, delete old downloads

* **File system errors**

  * Generic fallback: "⚠️ Rename failed - system error"
  * Actions: **Copy name**, **Try again**, **Report issue**
  * Log technical details for debugging (user can export)

### 9.3 Content & Naming Issues

* **Low confidence**

  * Auto mode: keep original; toast: "Skipped — unsure."
  * Confirm mode: show Review modal with context chips and 2 suggestions; if user allowed cloud assist, offer "Ask cloud for another option" secondary button with privacy reminder.

* **Conflicting filename**

  * Auto suffix "(1)" / "(2)" or increment token.
  * If series detected: suggest "- 1", "- 2", etc.
  * Show conflict resolution in Review modal

* **Restricted characters / too long**

  * Inline validation with red hint; auto-clean when possible; trim gracefully.
  * Preview shows cleaned version: "Will become: safe-filename-version"

* **Content parsing failures**

  * Fallback to metadata-only naming (date, file size, download source, file type)
  * Toast: "Used file info only - content unclear"
  * Option to manually trigger re-analysis when model is available

### 9.4 Privacy & Security

* **Privacy guard**

  * If metadata usage is off but detected, show subtle info: "Location detected (off). You can enable it in Settings."

* **Sensitive content detected**

  * Extra confirmation for detected personal info (SSN patterns, credit cards)
  * Option to exclude sensitive text from filename
  * "Keep completely original" quick action
  * If cloud assist toggle is on, surface warning "Sensitive content will not leave your device" and disable cloud routing for that event automatically.

### 9.5 Extension State Errors

* **Extension disabled/crashed**

  * Persistent notification: "NewName stopped working"
  * One-click restart; option to reset settings
  * Safe mode with minimal features only

* **Browser compatibility issues**

  * Graceful degradation for unsupported APIs
  * Feature detection with clear messaging about limitations
  * Alternative workflows for missing capabilities, including offering cloud assist when supported and consented.

---

## 10) Accessibility & i18n

* **Keyboard**:

  * Undo last rename: `Alt+Ctrl+Z` (extension-specific, avoids browser conflicts)
  * Edit last rename: `Alt+Ctrl+R` (R for Rename)
  * Quick popup: `Alt+Ctrl+N` (N for NewName)
  * Popup navigation: fully tabbable, ESC to close, Enter to activate primary
  * Toast focus: `Tab` from active window reaches toast actions when visible
* **Screen readers**:

  * Toasts announce role=“status”
  * Buttons have descriptive labels (“Undo rename to original filename”)
* **High contrast / reduced motion**: respect OS settings
* **Bidirectional & diacritics**: filenames render correctly; RTL support in UI

---

## 11) Metrics (privacy-respecting, opt-in)

* % Renamed vs Kept (split by on-device vs cloud assist)
* Revert rate & edit rate
* Time to first successful rename (onboarding success)
* Per-type engagement (to refine defaults)
* Cloud assist opt-in rate & per-user frequency (aggregate only, no content snippets)
* No content snippets stored; only aggregate counters and anonymized events when user opts in.

---

## 12) Visual style (quick spec)

* **Typography**: System font stack; 14–15px base in popup; 16px in settings.
* **Color**: Neutral UI; one accent color (success green for rename, warning amber for kept/low confidence).
* **Elevation**: Light shadows for modals/toasts.
* **Iconography**: Simple line icons per filetype; readable 16–20px.
* **Spacing**: Comfortable (8px grid), dense in the popup, roomy in Settings.

---

## 13) Roadmap (UX)

**MVP**

* First-run flow, Rename toast, Popup basics, Settings (General + Language/Format + Per-type), History (recent 50).

**v1**

* Confirm Mode modal, Metadata toggles UI, Better History filters, Series awareness (auto numbering), Live example preview in Settings.

**v2**

* Batch Review panel, Per-folder behaviors, Template builder UI, Desktop helper status drawer.

---

## 14) Sample user journeys by mode

### A) "Hands-off pro" (Balanced Mode)

* Installs → selects "🔄 Balanced" → downloads regular PDF → toast: "Renamed to **Tutorial - React hooks**" → continues working. Downloads invoice → Review modal appears → confirms rename. Later opens History to copy a name.

### B) "Power user" (Silent Mode)

* Installs → selects "🔇 Silent" → downloads 20 screenshots from design session → all renamed quietly in background → checks History later to see: "Figma - Component library", "Figma - Color tokens", etc. No interruptions during flow state.

### C) "Careful reviewer" (Careful Mode)

* Installs → selects "🛡️ Careful" → downloads any file → Review modal always appears → edits suggestions → builds personal naming preferences over time → consistent control.

### D) "Custom workflow" (Custom Mode)

* Installs → selects "⚙️ Custom" → sets "Confirm PDFs only" + "Silent mode for images" + "Toast for everything else" → gets exactly the behavior they want.
