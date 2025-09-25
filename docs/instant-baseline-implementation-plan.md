# Instant Baseline Guardrail Implementation Plan

## Overview

Originally authored for a heuristic-based guardrail rollout, this document is retained for historical context. Instant Baseline now relies exclusively on deterministic strategies (keep original, append date, reuse page title). The sections below describe the prior guardrail work and can be considered deprecated guidance.

## Key Gaps Identified

- Legacy `entrypoints/shared/pipeline/phase1-coordinator.ts` (superseded by deterministic `instant-baseline-strategy.ts`) always emitted a renamed filename and lacked decision metadata, so callers could not keep the original.
- Retired heuristic modules (`entrypoints/shared/analysis/heuristics-orchestrator.ts`, `candidate-ranking.ts`) discarded per-signal scores, preventing guardrail assessment of confidence or conflicting context.
- `entrypoints/background.ts` applies rename suggestions based solely on file-type toggles and logs Instant Baseline history even when we should keep.
- `entrypoints/shared/history/history.ts` cannot persist outcome/guardrail details, preventing guardrail telemetry.
- Instant Baseline unit and E2E tests assert aggressive rename behaviour that no longer matches the conservative goals; semantic cases belong to Contextual Upgrade.

## Implementation Steps

1. **Extend heuristic scoring data** (historical)
   - Update `candidate-ranking` to expose structured scoring (subject strength, garbage penalties, existing-name assessment) and document the ≥85 guardrail.
   - Modify `runInstantBaselineHeuristics` to return the full candidate list and a normalized view of the original filename for guardrail checks.

2. **Introduce Instant Baseline decision guardrails** (implemented via deterministic strategies)
   - Define a `Phase1Decision` (outcome, confidence, guardrail, reasons) emitted alongside the formatted filename. ✅
   - Implement deterministic guardrails: high-trust subject ≥85, garbage with reinforcing signals, template allowlist, conflict blockers. Superseded by the current conservative strategy selection that keeps the original when inputs are missing.
   - Update debug types to surface the new decision metadata. ✅

3. **Integrate decision into background flow & history**
   - In `background.ts`, only call `suggest` with a renamed path when the decision outcome is `rename`; otherwise reuse the original name and enqueue for Contextual Upgrade.
   - Extend history items to store confidence, guardrail reason, and outcome so analytics can track “Kept original” events.

4. **Revise Instant Baseline unit coverage**
   - Rewrite heuristics tests to validate guardrail signals (e.g., garbage filename + reinforcements) rather than universal renames.
   - Update pipeline tests to exercise both rename and keep outcomes and assert decision metadata.
   - Add targeted tests for guardrail helpers such as existing descriptive names or low-context downloads.

5. **Trim or migrate Instant Baseline E2E assertions**
   - Narrow `instant-context-analysis` to high-confidence rename cases and assert the “Kept original” toast when guardrails fire.
   - Move semantic-heavy expectations (academic paper, meeting notes enrichment, precise amount extraction) into a Contextual Upgrade suite or mark them TODO for the Contextual Upgrade stage.
   - Ensure test utilities handle history entries where `final === original` and decision info is present.

6. **Telemetry & follow-up validation**
   - Wire guardrail metadata into telemetry once available.
   - After implementation, run linting, targeted unit suites, and updated Playwright scenarios to confirm conservative behaviour.
