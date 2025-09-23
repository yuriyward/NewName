# NewName — WXT + React

This project is a Chrome MV3 extension that intelligently renames downloads.

## Development

- Install dependencies: `bun install`
- Dev server: `bun run dev`
- Build: `bun run build`
- Zip: `bun run zip`
- Fix: `bun run fix`
- Verify: `bun run verify`
- Unit tests: `bun run test`

## End-to-End tests (Playwright)

Playwright E2E validates full download flows and Phase‑1 rename behavior.

- Install browser binaries: `bun run e2e:install`
- Build extension: `bun run build`
- Run E2E (no auto-open report): `bun run e2e`
- Run E2E and auto-open HTML report: `bun run e2e:report`

 Notes
- The extension is built before tests and loaded from `.output/chrome-mv3`.
- The Playwright server serves `tests/fixtures` at `http://127.0.0.1:43210`.
- Add more files under `tests/fixtures/files/` and link them in `tests/fixtures/index.html`.
