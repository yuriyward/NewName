# Phase 2 Implementation Epics — “NewName”

## Overview

Phase 2 extends the MVP deterministic renaming flow (Phase 1) into a more expressive, trust-forward experience that covers additional file types, gives users finer control, and introduces opt-in cloud assistance. The epics below integrate product, technical, and design requirements (see `docs/PRD-*.md`) so engineering and design can execute in parallel with shared acceptance criteria.

## Epic A — Multi-Media Instant Baseline & Upgrade Coverage

**Objective.** Deliver deterministic Instant Baseline decisions and metadata-based contextual upgrades for audio, video, and archive/installer downloads so automation benefits the most common non-document payloads while preserving Phase 1 guardrails and UX expectations.

**Primary work.**
- Extend file-type classification to audio/video/archive formats; expose new types end-to-end (downloads metadata → policy engine → settings/per-type UI → history telemetry badges).
- Implement deterministic Instant Baseline handling per new type by reading container metadata with mediainfo.js (duration, resolution, sample rate, channels, codecs), generating helpful suffixes that respect the safe filename policy and separator preferences; avoid filename-derived heuristics for media.
- Build offscreen extraction for Phase 2 upgrades: archive manifest inspection for better naming. For audio/video, rely on existing mediainfo.js metadata from Instant Baseline (no content analysis).
- Update upgrade scoring/guardrails to compare metadata-enriched filenames against Phase 1 decisions; never regress keep outcomes when context is weak.
- Expand unit/integration coverage and add media-focused Playwright scenarios, including Undo/Upgrade behaviour.
- Collaborate with design on visual/audio cues (file-type icons, ✨ upgrade cards for media) and ensure toast/notification copy matches the design PRD (reason tags, badges, tone).

**Dependencies.**
- WASM helpers for archive inspection (e.g., lightweight ZIP readers) sized within offscreen performance budgets and cleared for licensing.
- Updated iconography and badges for new file types.

**Acceptance.**
- Audio/video/archive downloads either receive deterministic renamed filenames or are intentionally kept with logged guardrail reasons and correct toast copy ("Kept original — already clear").
- Contextual Upgrade offers metadata-based improvements (archive manifest inspection) within latency budgets; audio/video rely on existing mediainfo.js metadata from Instant Baseline with design-specified badges (Duration/Resolution tags).
- QA sign-off via new automated + manual media cases; no regressions to PDF/image flows.

**Risks / Mitigations.**
- Large archive files → rely on partial reads of manifest data only; strict timeouts prevent blocking.
- Tooling licensing → prefer permissive libraries for archive inspection; document alternative builds if redistribution limits apply.

## Epic B — Confirm Modal, Mode Flows & Per-Type Controls

**Objective.** Respect user agency by launching the confirm-before-apply experience, mode-specific behaviours, and surfaced metadata toggles consistent with the design PRD’s IA.

**Primary work.**
- Implement the Confirm Modal UI (editable name, reason tags, language selector, accessibility support) with design-provided layout, copy, and micro-interactions.
- Extend onboarding and settings to match design flow: mode cards, metadata toggles, per-type automation controls, live previews, and diagnostics surface updates.
- Update settings schema/storage (version bump + migration) for per-type behaviour (`auto`/`confirm`/`off`), metadata toggles, modal defaults; ensure Balanced/Silent/Careful modes behave per design (e.g., legal/financial detection triggers Confirm in Balanced).
- Instrument background worker to trigger modal/toast flows correctly; ensure Silent mode suppresses notifications per design guidance.
- Add tests for settings persistence, reducers, and confirm workflows; include Playwright coverage across modes with keyboard navigation checks.
- Coordinate with localization for new strings (PL/EN/UK) and ensure copy matches design tone (“concise, friendly, non-cute”).

**Dependencies.**
- Shared modal component patterns, accessibility tokens, and Tailwind v4 updates.
- i18n bundles and translation pipeline for new microcopy.

**Acceptance.**
- Users can configure mode/per-type behaviour; confirm modal appears exactly when required, supports keyboard/screen reader patterns, and respects metadata toggles (e.g., disabling geo prevents EXIF usage).
- Onboarding screens (Modes, Cloud, Downloads access, AI activation) reflect design structure and persist choices.
- Upgrade, undo, and history flows continue to work in Balanced, Silent, and Careful modes.

**Risks / Mitigations.**
- Modal fatigue → Balanced defaults limit confirmations to sensitive docs; provide quick “Always auto-apply for this type/site” action.
- Settings migration bugs → implement defensive parsing, backfill defaults, and cover with unit tests.

## Epic C — Cloud Assist Launch & Transparent Routing

**Objective.** Introduce opt-in cloud assistance via Firebase AI Logic while preserving on-device defaults, scoped permissions, and the trust-first design (badges, disclosures, copy).

**Primary work.**
- Build routing layer that evaluates AI availability, user preferences, and file type to select on-device vs. cloud vs. metadata-only pipelines; persist routing decisions for history/telemetry.
- Integrate Firebase AI Logic with redaction safeguards; validate structured responses and fall back gracefully on latency/timeouts.
- Implement onboarding Screen 2 (“Stay on device or allow cloud assist?”) and settings controls (per-type checkboxes, disclosure links) with design copy.
- Surface processing badges and reason tags in toasts, upgrade notifications, history rows, and confirm modal (“On-device”, “Cloud assist”) as specified.
- Add telemetry counters for cloud opt-ins/usage, and history markers so users can audit cloud-assisted renames.
- Create mocks and tests for cloud responses, including error handling (network loss, quota) and ensuring sensitive content stays local when toggles demand it.

**Dependencies.**
- Firebase project configuration + secrets; legal/privacy sign-off on data handling.
- Badge/icon assets and UX copy.

**Acceptance.**
- Cloud assist remains off by default; enabling it requires explicit per-type consent through onboarding or settings.
- When enabled, upgrades route per design rules and always show transparent indicators; errors revert to on-device or metadata-only flows with appropriate copy (“On-device model not ready — using Metadata-only mode”).
- Telemetry accurately captures cloud usage without leaking content.

**Risks / Mitigations.**
- Privacy concerns → maintain opt-in with clear copy, expose quick disable, and document retention policies in help center.
- Network variability → implement exponential backoff and fallback paths; keep user informed via non-intrusive notifications.

## Epic D — Series Awareness & Conflict Resolution UX

**Objective.** Reduce manual cleanup for sequential/conflicting downloads through deterministic suffixing and history awareness, presented with clear, friendly UX cues.

**Primary work.**
- Enhance history tracking with recent-download context to detect series (e.g., bursts of screenshots, repeated invoices) and feed conflict logic.
- Implement conflict resolver that generates human-friendly suffixes (`- 2`, `Part 2`, duration qualifiers) while respecting length caps and separator styles; expose behaviour in settings if needed.
- Update UI surfaces (toast messaging, confirm modal banners, history rows) to explain when conflicts were auto-resolved (“Supabase — CORS… — auto-numbered to avoid duplicates”).
- Ensure Undo/Upgrade flows maintain coherent numbering and provide deterministic outcomes even when users revert or reapply upgrades.
- Add regression tests covering simultaneous downloads, race conditions, and rename failures; include UI checks for conflict messaging.

**Dependencies.**
- Service worker locking/queueing to avoid race conditions with File System Access.
- History storage adjustments so series metadata fits within retention limits.
- Design review for suffix copy and iconography.

**Acceptance.**
- Chrome’s default `filename (1)` suffix never appears; extension resolves conflicts before handoff.
- Series downloads receive intuitive numbering and surface inline explanations per design guidelines.
- Undo/Upgrade maintains sequential logic without duplicating suffixes.

**Risks / Mitigations.**
- Overzealous sequencing → allow users to disable series handling; include clear Undo copy.
- Concurrent downloads → centralize conflict handling in the service worker with retry + telemetry on contention.

## Epic E — Observability, Telemetry & QA Expansion

**Objective.** Provide instrumentation, diagnostics, and automated coverage to monitor Phase 2 rollouts while ensuring design’s “trust at a glance” principle holds in real usage.

**Primary work.**
- Extend opt-in telemetry for new events (confirm shown/applied, cloud routed, media upgrades accepted, conflict resolver triggers) aligned with privacy posture.
- Build developer diagnostics (debug panel, log export) that mirror design’s Diagnostics section (model status, error log viewer) and highlight processing badges.
- Expand Vitest suites for new reducers, routing helpers, and media policy logic; extend Playwright coverage for confirm/cloud/conflict scenarios, including accessibility assertions (status role toasts, keyboard shortcuts).
- Update release checklist to include feature flags, kill switches, staged rollout metrics, and design QA checkpoints (copy review, badge accuracy).
- Coordinate with design to keep microcopy consistent (e.g., “✨ Found better name” vs “🔄 Suggested improvement”) through centralized string definitions.

**Dependencies.**
- Telemetry backend or local aggregation strategy that remains optional and anonymous.
- CI capacity for expanded suites; snapshot testing strategy for UI tokens.

**Acceptance.**
- Dashboards or reports answer key adoption/trust questions (confirm uptake, cloud opt-in %, media rename success, conflict resolver usage) without storing content.
- Automated suites cover new flows and run reliably in CI; accessibility checks pass.
- Developer diagnostics expose routing decisions and badge states for support/debugging.

**Risks / Mitigations.**
- Telemetry opt-in friction → keep collection optional with clear consent copy and “Clear local logs” UX control.
- Test flakiness from media/AI mocks → isolate deterministic fixtures, stub network calls, and document best practices for contributors.

## Milestones & Cross-Functional Checkpoints

1. **Foundation (Weeks 0–1).** Align engineering/design/PM on flows; finalize onboarding + confirm modal specs; secure Firebase credentials; land shared settings schema updates and iconography.
2. **Media & Controls (Weeks 1–4).** Parallelize Epic A (media coverage) and Epic B (modal + modes). Hold weekly design reviews to validate toasts/modal states and microcopy before implementation locks.
3. **Cloud Assist (Weeks 4–6).** Implement Epic C once routing hooks exist; run privacy/legal review and user-testing of copy/badges before enabling beta flag.
4. **Series & Observability (Weeks 5–7).** Deliver Epic D (conflict resolution) and Epic E (telemetry/testing); include dedicated accessibility QA pass for confirm modal and notifications.
5. **Beta Launch Readiness (Week 8).** Conduct cross-epic regression suite, finalize localization, update help center, and sign off on design QA checklist (“Trust at a glance” badges, copy polish) before staged rollout.

## Incremental Implementation Tasks

### Epic A — Multi-Media Instant Baseline & Upgrade Coverage
- [X] Extend file-type classifier and policy engine to recognise audio, video, and archive formats end-to-end (downloads metadata → settings toggles → history badges) with unit tests.
- [X] Implement deterministic Instant Baseline naming helpers that consume mediainfo.js results (duration, resolution, sample rate, channels, codecs) to add relevant qualifiers; do not rely on filename parsing; respect separator preferences and length caps.
- [ ] Prototype offscreen archive upgrade pipeline (manifest inspection for better naming) with timeout guards and Playwright coverage for Upgrade/Undo paths; audio/video use existing mediainfo.js metadata from Instant Baseline.

### Epic B — Confirm Modal, Mode Flows & Per-Type Controls
- [X] Ship settings schema v2 with per-type behaviour flags and metadata toggles, plus migration tests and localisation hooks.
- [ ] Build accessible Confirm Modal UI shell, wire it to Balanced/Careful flows, and exercise keyboard + screen reader interactions in automated tests.
- [ ] Implement onboarding screens (Mode, Cloud, Downloads access, AI activation) with persistent storage integration and smoke tests for mode-specific behaviours.

### Epic C — Cloud Assist Launch & Transparent Routing
- [ ] Add routing evaluator that chooses on-device, cloud, or metadata-only pipelines based on availability, consent, and file type while logging history annotations.
- [ ] Integrate Firebase AI Logic client with redaction safeguards, structured response validation, and retry/fallback logic covered by unit mocks.
- [ ] Surface processing badges and reason tags (“On-device”, “Cloud assist”) across toasts, upgrade notifications, confirm modal, and history rows using shared components.

### Epic D — Series Awareness & Conflict Resolution UX
- [ ] Enhance history store to capture recent-download context for series detection and expose it to conflict handlers.
- [ ] Replace Chrome default conflict naming with deterministic suffix generator that respects length caps and separator styles, including concurrency safeguards.
- [ ] Update toast/modal/history copy to explain auto-numbered outcomes and verify Undo/Upgrade maintains coherent sequencing.

### Epic E — Observability, Telemetry & QA Expansion
- [ ] Instrument opt-in telemetry events for confirm flows, cloud routing, media upgrades, and conflict resolution while honouring privacy settings.
- [ ] Expand Vitest and Playwright suites to cover new reducers, routing helpers, accessibility assertions, and cloud/series scenarios.
- [ ] Build developer diagnostics panel that surfaces routing decisions, badge states, and exportable logs aligned with the design diagnostics spec.
