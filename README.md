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
- Manual testing: `bun run test:manual`

## Testing

### Unit Tests (Vitest)
- Run tests: `bun run test`
- Watch mode: `bun run test:watch`
- Coverage: `bun run coverage`

### End-to-End Tests (Playwright)
Playwright E2E validates full download flows and Phase‑1 rename behavior.

- Install browser binaries: `bun run e2e:install`
- Build extension: `bun run build`
- Run E2E (no auto-open report): `bun run e2e`
- Run E2E and auto-open HTML report: `bun run e2e:report`

### Manual Testing
Test the extension with realistic download scenarios:

1. **Start the test server**: `bun run test:manual`
2. **Build and load the extension**:
   - Run `bun run build` to build the extension
   - Load `/.output/chrome-mv3` in Chrome's extension manager
3. **Test scenarios**:
   - Navigate to http://127.0.0.1:43210
   - Browse realistic test scenarios and download files
   - Observe how the extension renames downloads

**Available test scenarios**:
- 🏢 Business: Polish invoices, meeting notes, financial documents
- 🎨 Design: Figma exports, UI components, mockups
- 📚 Academic: Research papers, journal articles
- 📸 Media: Screenshots, photos, videos

**Notes**:
- The extension is built before tests and loaded from `.output/chrome-mv3`
- The test server serves `tests/fixtures` at `http://127.0.0.1:43210`
- Manual testing uses the same fixtures as E2E tests for consistency
