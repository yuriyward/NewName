# Epic B.2 — Confirm Toast & Mode Flows (Implementation Plan)

## 1. Goals & UX Summary
- Deliver a **non-blocking confirmation toast** that appears in the top-right of the active tab, shows the proposed filename, optional metadata chips, and a visible countdown.
- Allow users to continue browsing while the toast runs; approving applies immediately, ignoring auto-applies after a configurable timeout (default 10 s), unless the mode disables auto-apply.
- Honour mode behaviour:
  - **Balanced:** toast only for sensitive/legal/financial detections or per-type `confirm`.
  - **Careful:** toast for every rename, no countdown (manual decision required).
  - **Silent:** never show the toast; rename immediately.
  - **Custom:** per-type + metadata toggles drive routing.
- Preserve accessibility and localisation requirements from the design PRD.

## 2. Key Constraints & Assumptions
- `downloads.onDeterminingFilename` must call `suggest()` within ~2 s (`SUGGEST_TIMEOUT_MS`). Therefore we **default to the original filename** when confirmation is required, and apply the rename later via the File System Access (FSA) bridge once the decision is known.
- Toast-driven rename depends on the user granting Downloads access during onboarding. When access is missing we:
  1. fall back to immediate rename (if mode allows), or
  2. keep original name and mark history with `requires-permission`, prompting the user.
- Balanced/Careful require reliable sensitive-document detection; false positives should be rare and undoable.
- Undo/History already rely on the FSA bridge; we will reuse that pipeline for final rename execution.

## 3. Architecture Overview
1. **Background (service worker)**
   - Evaluates Instant Baseline strategies; when confirmation is required, calls `suggest()` with the original filename and pushes a `PendingConfirmation` entry (`downloadId`, `historyId`, `proposal`, `expiresAt`, `mode`, `fileType`, `sensitiveReasons`).
   - Publishes a `showConfirmToast` message (new channel) to the active tab + extension UI.
   - Listens for user decisions via `confirmToastDecision` messages and auto-apply timers.
   - On decision, orchestrates rename through:
     - **a)** waiting for `downloads.onChanged` → `state === 'complete'`,
     - **b)** using the Downloads access handle to rename (`fsBridge.rename()`),
     - **c)** updating history/logging/outcomes.

2. **Toast presentation layer**
   - Content script injects a lightweight React root (or WXT-rendered overlay) to display stacked toasts.
   - Shared toast manager in `entrypoints/shared/ui/confirm-toast-manager.ts` tracks active toasts, countdown state (pausable on hover), and keyboard focus.
   - Toast component (`ConfirmToast.tsx`) renders proposed rename with inline edit field, countdown, action buttons, secondary actions ("Keep original", "Always apply for this type").

3. **Settings/UI**
   - Extend settings schema with `confirmToast` block:
     ```ts
     confirmToast: {
       autoApplyDelaySeconds: number; // 5–30, default 10
       showReasonTags: boolean;
       showRenameNotifications: boolean; // default true
     }
     ```
   - Surface controls in onboarding (for Custom mode) and full settings page.
   - Add "Always auto-apply for this type/site" quick action to update per-type overrides or site-specific rules (deferred if site scoping arrives later).

4. **Telemetry**
   - New events: `confirm_toast_shown`, `confirm_toast_action` (`approve`, `keep`, `timeout`), `confirm_toast_permission_blocked`, `confirm_toast_edited`, `rename_notification_shown`.
   - Respect privacy toggles; log only non-content metadata.

## 4. Detailed Flow
1. **Download interception**
   - Instant Baseline runs.
   - If configured behaviour -> `confirm`, background records pending confirmation and calls `suggest()` without rename.
   - History entry logged as `pending-confirm`.

2. **Toast lifecycle**
   - Background sends `showConfirmToast` to content script for the initiating tab (fallback to popup service worker if tab unavailable).
   - Toast manager renders toast with countdown. Countdown pauses on hover and resumes on mouse out. When countdown hits zero:
     - Balanced/Custom: auto-apply; background receives timeout signal.
     - Careful: countdown displays `∞`/"Waiting" and no auto action.

3. **Decision handling**
   - **Approve:** content script posts `confirmToastDecision` (`action:'approve'`, optional edited name). Background updates proposal, waits for download completion, renames via FSA bridge, logs success, notifies toast manager to dismiss, shows success notification if `showRenameNotifications` setting enabled.
   - **Keep original:** background marks history as `kept-by-user`, clears pending entry, emits toast dismissal.
   - **Always apply:** background updates per-type behaviour to `auto` (or persistent allowlist), reprocesses queued items if applicable.
   - **Timeout auto-apply:** same as approve with original proposal, shows success notification if enabled.
   - In all cases we send status back for UX feedback (e.g., quick chip "Applied" / "Kept").

4. **Fallbacks**
   - If FSA rename fails (permission revoked, file missing), show failure toast + History entry with `needs-attention`, prompt user to grant access or retry via history action.
   - If tab closes mid-countdown, toast manager in background falls back to extension view: we store pending decision and continue countdown; if user never responds we auto-apply/keep based on mode.

## 5. Component Work Items
- **entrypoints/shared/ui/ConfirmToast.tsx** — React component; includes countdown (pauses on hover), action buttons, reason tags, inline edit field.
- **entrypoints/shared/ui/confirm-toast-manager.ts** — manages toast stack, countdown timers with hover pause/resume, focus, messaging bridge.
- **entrypoints/shared/classification/sensitive-content.ts** — helper for legal/financial detection (reused by Balanced mode).
- **entrypoints/shared/messaging/extension-messaging.ts** — extend protocol with `showConfirmToast`, `confirmToastDecision`, `confirmToastStatus`.
- **entrypoints/background/download-coordinator.ts** — emit pending confirmations, manage history state, listen for decisions.
- **entrypoints/background/confirm-toast-controller.ts** (new) — encapsulates pending map, auto-apply timers, FSA rename orchestration, integration with download tracking.
- **entrypoints/content.ts** — subscribe to new messages, mount/unmount toast root, forward user actions.
- **entrypoints/popup/** — optional toast mirror for scenarios where tab UI unavailable.
- **entrypoints/shared/settings/** — schema, validation, defaults, migrations, UI wiring for new settings.
- **tests/** — unit + E2E coverage (see §8).

## 6. Accessibility & Localisation
- Toast container `role="status"`; dynamic content announced via `aria-live="polite"`.
- Ensure keyboard access: first focusable element is primary action; `Esc` closes and defaults to "Keep original".
- Provide `aria-label`/text updates for countdown ("Auto-applying in 9 seconds").
- Honour `prefers-reduced-motion`; provide non-animated fallback.
- All strings piped through localisation bundles (PL/EN/UK).

### CSS Isolation
- Toast content script must use Shadow DOM (closed mode) to prevent host page CSS from overriding Tailwind utility classes.
- Import Tailwind styles inline (`?inline`) and inject directly into Shadow DOM root.
- This ensures toast appearance remains consistent across all websites regardless of their own Tailwind or conflicting CSS.

## 7. Telemetry & Diagnostics
- Extend debug logging to include pending confirmation lifecycle.
- Update history entries with flags: `decisionSource: 'user-approve' | 'auto-timeout' | 'user-keep'`.
- Add developer debug overlay (behind flag) to visualize outstanding confirmations for QA.

## 8. Testing Strategy
- **Unit tests**
  - Sensitive detection helper (regex/heuristics).
  - Toast manager countdown/queue and hover pause.
  - Background controller auto-apply timer and permission fallbacks.
  - Settings migration to include `confirmToast` defaults.
- **Integration tests (Vitest)**
  - Pending confirmation path updates history correctly.
  - FSA rename service handles success/failure.
- **Playwright**
  - `confirm-toast-balanced.spec.ts`: sensitive doc triggers toast, auto-applies after timeout.
  - `confirm-toast-careful.spec.ts`: toast without countdown; rename occurs only on manual approve.
  - `confirm-toast-timeout.spec.ts`: countdown pause on hover, resume, auto-apply.
  - `confirm-toast-keyboard.spec.ts`: tab/enter/escape flow, screen reader roles.
  - `confirm-toast-permission.spec.ts`: missing FSA surfaces prompt and fallback message.

## 9. Open Questions / Follow-ups
1. Confirm whether per-site overrides ("Always apply for this site") are in scope for Phase 2 or deferred.
2. Define exact copy for permission fallback toasts ("We need Downloads access to finish renaming").
3. Verify onboarding ensures FSA grant before Balanced/Careful flows rely on it; otherwise require runtime prompt.
4. Align telemetry schema with analytics pipeline (naming + privacy review).

## 10. Developer Testing Notes
- Until sensitive detection heuristics are finalized, switch to **Careful** mode (`await updateSettings({ mode: 'careful' })`) or set a file-type behavior to `confirm` if you need to force the confirmation toast for manual QA.
- The `confirmToast.showRenameNotifications` toggle now controls the lightweight in-page overlay that appears after automatic renames; it defaults to `true` so Balanced and Custom modes still get visibility when the confirmation toast does not appear.
- Silent mode continues to suppress both the confirm toast and follow-up rename notifications by design.

---

_Last updated: 6 Oct 2025_
