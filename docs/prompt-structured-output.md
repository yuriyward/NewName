# Structured Output Prompts for Chrome Prompt API

## Overview

Both the image rename decision flow and the filename generator now rely on Chrome's Prompt API response constraints to guarantee valid JSON output. This document captures the pattern so future prompt work can follow the same structure without re‑discovering the approach.

## Key Changes (October 17, 2025)

- `entrypoints/offscreen/image-analysis/image-rename-decision.ts`: Added `IMAGE_RENAME_DECISION_SCHEMA` and example-driven prompt instructions. The session call now passes the schema through `responseConstraint` with `omitResponseConstraintInput: true`.
- `entrypoints/offscreen/text-analysis/filename-generation.ts`: Added `FILENAME_GENERATION_SCHEMA` hardening and a rewritten prompt that includes the JSON schema preview plus example payloads. The session call mirrors the rename decision behavior.

## Implementation Pattern

1. **Define a JSON schema** that captures the expected response shape (`type`, `required`, `enum`, `maxLength`, and `additionalProperties: false` when helpful).
2. **Describe the schema inside the prompt** with a short fenced JSON block and provide 1–2 well-formed examples that demonstrate the desired formatting.
3. **Invoke `session.prompt` with `responseConstraint`** pointing to the schema and set `omitResponseConstraintInput: true` to avoid re-sending the schema as part of the prompt text.
4. **Log session usage** (both before and after the prompt call) to simplify debugging when quotas or malformed output occur.
5. **Parse responses with `parseStructuredResponse`** and layer on runtime validation to guard against missing or mistyped fields.

## Why It Matters

- Ensures downstream JSON parsing never fails due to trailing commas, markdown wrappers, or missing keys.
- Gives Chrome's Prompt API enough structure to reject malformed replies, reducing retry logic.
- Creates consistent logging so token usage and session state issues are easy to diagnose.

## Next Steps

- Apply the same pattern to any future Prompt API integrations (summaries, rule explanations, etc.).
- Consider centralizing shared schema helpers if additional modules need similar enforcement.
