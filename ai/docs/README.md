# Documentation Hub

This folder is the central place for both static docs and auto‑generated documentation.

## What's here

- `FILE-STRUCTURE.md` (auto‑generated):
  - Full project tree with brief descriptions
  - Per‑file purpose and export summaries
- `ai-chrome-prompt-api.md`:
  - Reference notes for Chrome Prompt API usage patterns
- `chrome-service-worker-long-running-tasks.md`:
  - Guide for implementing delayed/scheduled operations that survive service worker termination
  - `chrome.alarms` API patterns, state persistence, and production best practices
- Root `AI.md` (guidance for agents):
  - Conventions, domain organization, reuse‑first guidance, and workflows

## Generate/refresh docs

Use the built‑in script (preferred):

```bash
bun run docs
```

Or run the generator directly:

```bash
node scripts/generate-structure-docs.js
```

This analyzes TypeScript via TypeDoc and updates `FILE-STRUCTURE.md`. It also syncs the tree block in `AI.md` if present.

## Suggested docs to add next

- `ARCHITECTURE.md`: Extension architecture, data flow, and key decisions
- `API.md`: Core types, hooks, and messaging contracts with examples
- `DEVELOPMENT.md`: Setup, commands, code quality workflow, and contribution guide

## Authoring guidelines

- Keep docs concise and task‑oriented; link to code when possible
- Prefer examples over prose when introducing APIs
- Mirror the domain structure used in code (renaming, rules, integrations, ui)
- Normalize filenames: lowercase, hyphenated; one topic per file

## Maintenance

- After notable code changes, re‑generate docs:
  - `bun run docs`
  - Commit updated markdown alongside the code change
- Improve TypeDoc comments in source to enhance generated sections
- Keep links and examples accurate; update when APIs change
