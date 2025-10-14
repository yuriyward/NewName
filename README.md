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

## Chrome AI Setup for Development

When using `bun run dev`, WXT creates a **separate Chrome profile** that requires its own configuration. Chrome AI (Gemini Nano) must be enabled specifically in this development instance.

### Quick Setup

1. **Start WXT dev server**: `bun run dev`
2. **Enable Chrome flags in the WXT Chrome window**:
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano` → Set to "Enabled"
   - Navigate to `chrome://flags/#optimization-guide-on-device-model` → Set to "Enabled BypassPerfRequirement"
   - Click "Relaunch" and wait for Chrome to restart
3. **Verify component download**:
   - Open `chrome://components/`
   - Look for "Optimization Guide On Device Model"
   - If version shows `0.0.0.0`, click "Check for update"
   - Component may take 1-2 days to appear after enabling flags
4. **Check model status**:
   - Open `chrome://on-device-internals` in the WXT window
   - Verify models are listed in the "Model Status" tab
5. **Enable AI in the extension**:
   - Click the extension icon in WXT Chrome
   - Click "Enable AI models" button
   - Follow the setup flow to download models (~2GB)

### Important Notes

- ⚠️ **Chrome flags in regular Chrome don't affect WXT** - enable them in the WXT window
- ⚠️ **Separate profile** - WXT stores its profile in `.wxt/chrome-data/`
- ⚠️ **Component download** - Can take 1-2 days to appear after enabling flags
- ⚠️ **Chrome 138+** - Required for Gemini Nano support

For detailed troubleshooting and setup instructions, see [`docs/wxt-chrome-ai-setup.md`](./docs/wxt-chrome-ai-setup.md).

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
