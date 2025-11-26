# Frequently Asked Questions

Common questions about NewName features, architecture, and design decisions.

---

## General Questions

### What is NewName?

NewName is a Chrome extension that automatically suggests intelligent, descriptive filenames for your downloads using AI. It analyzes file content, page context, and metadata to generate human-readable names, saving you from manually renaming files like `Screenshot_2024_01_15_at_3.42.18_PM.png` or `document (1).pdf`.

### How does the AI work?

NewName uses a two-tier approach:

1. **Local AI (preferred)**: Chrome's built-in Gemini Nano runs entirely on your device for privacy
2. **Cloud AI (fallback)**: Google Gemini API when local AI unavailable (requires your API key)

The AI analyzes file content, page titles, download context, and metadata to generate semantically meaningful filenames.

### Is it free?

Yes, NewName is completely free and open source. If you choose to use cloud AI, you'll need your own Google Gemini API key (which has free tier limits).

### What file types are supported?

- **Text files**: .txt, .md, .json, .csv, etc.
- **Documents**: .pdf, .doc, .docx
- **Images**: .jpg, .png, .gif, .webp, etc.
- **Media**: .mp4, .mkv, .mp3, .wav, etc.
- **Archives**: .zip, .tar, .gz, etc.

---

## Privacy & Security

### Why does it need "Read all your data" permission?

**Short answer:** To capture page titles for better AI suggestions.

**Long answer:** When you download a file, NewName captures the page title and first heading to provide context to AI. For example, downloading `report.pdf` from "Q4 2023 Financial Report - Acme Corp" allows AI to suggest `2023-Q4-Acme-Financial-Report.pdf`.

**Technical reason:** Downloads can happen seconds after you click (network delay), and you may switch tabs in the meantime. NewName uses proactive capture + cache to ensure context is available when the download starts.

**What we actually access:**
- ✅ Page title (`document.title`)
- ✅ First heading (H1-H6)
- ❌ NOT page content, forms, passwords, or sensitive data

See [PRIVACY.md](../PRIVACY.md) for complete details.

### Is my data sent to external servers?

**By default: No.** Everything runs locally using Chrome's built-in AI.

**With cloud AI: Only if you enable it.** When using Google Gemini API:
- File content excerpts sent to Google for analysis
- Requires your explicit consent and API key
- You control when it's used via settings

### Can I use NewName without AI?

Yes! NewName has manual rename strategies that work without AI:
- Pattern-based detection (timestamps, hashes, resolutions)
- URL-based naming
- Metadata-based naming

Go to Settings → Processing Mode → Manual to disable AI entirely.

---

## Technical Questions

### Why two-phase rename pipeline?

NewName uses a **two-phase approach** for best performance:

**Phase 1 - Instant Baseline:**
- Runs synchronously during download
- Uses deterministic strategies (patterns, URLs)
- Provides immediate results

**Phase 2 - Contextual Upgrade (optional):**
- Runs asynchronously after download completes
- Uses AI analysis for enhanced suggestions
- Proposes improvements via toast notification

This ensures you never wait for AI while still getting intelligent suggestions when available.

### Why use File System Access API?

Chrome's downloads API can suggest filenames but cannot rename after download. For Phase 2 upgrades, we need to rename files post-download. File System Access API:
- Provides secure access to files with user consent
- Enables post-download renaming
- Maintains file integrity with atomic operations

### How does proactive page context capture work?

**Architecture:**

```
Page loads → Content script captures title/heading
           ↓
       Stored in background cache (5-min TTL)
           ↓
User clicks download → Chrome fires onDeterminingFilename
           ↓
Background retrieves context from cache
           ↓
AI analyzes: filename + URL + page context
           ↓
Generate intelligent suggestion
```

**Why not capture on-demand?**
- Downloads start asynchronously (network delay)
- User may switch tabs before download begins
- Tab may be closed before download completes
- Proactive capture ensures context availability

**Code references:**
- Content script: `entrypoints/content.ts:214-242`
- Cache implementation: `entrypoints/shared/state/page-context-store.ts`
- Download coordinator: `entrypoints/background/download-coordinator.ts`

### Why `<all_urls>` instead of `activeTab` permission?

**Technical limitation:** `activeTab` only grants access at the moment of user interaction, not ongoing access.

**Problem:**
1. User on Tab A clicks download link
2. User switches to Tab B (Tab A no longer active)
3. Chrome starts download 2-5 seconds later
4. Extension needs Tab A's context, but `activeTab` only gives access to Tab B

**Solution:** `<all_urls>` allows content script to proactively capture context on all tabs before downloads start.

**Alternative considered:** `optional_host_permissions` with user opt-in. Decided against it to reduce onboarding friction, but could be reconsidered based on user feedback.

### How does MediaInfo.js integration work?

For video/audio files, NewName uses MediaInfo.js (WASM) to extract:
- Video: codec, resolution, frame rate, duration
- Audio: codec, channels, sample rate, bitrate

**Sandboxing:** MediaInfo.js runs in a sandboxed iframe (`sandbox.html`) because Emscripten glue code requires `unsafe-eval`. This isolates potential security risks.

**Offscreen document:** The sandbox is loaded in an offscreen document to prevent UI jank during heavy processing.

**Implementation:**
- Sandbox bridge: `entrypoints/sandbox/main.ts`
- Offscreen coordinator: `entrypoints/offscreen/media-analysis-handler.ts`
- Queue manager: `entrypoints/shared/integrations/mediainfo/media-analysis-queue.ts`

### How does PDF analysis work?

NewName uses MuPDF (WASM) to:
1. Render PDF pages to images (first 2 pages)
2. Extract text content and titles
3. Analyze with multimodal AI (image + text)

**Why image analysis?** Many PDFs have visual layouts (headers, logos, formatting) that text extraction misses. Multimodal AI understands both.

**Implementation:**
- PDF renderer: `entrypoints/offscreen/pdf-analysis/pdf-renderer.ts`
- Pipeline: `entrypoints/offscreen/pdf-analysis/pdf-analysis-pipeline.ts`
- Title extraction: `entrypoints/offscreen/pdf-analysis/pdf-title-description.ts`

---

## Usage Questions

### How do I enable local AI models?

1. **Enable Chrome flags:**
   - `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → Enabled
   - `chrome://flags/#optimization-guide-on-device-model` → Enabled
   - `chrome://flags/#translation-api` → Enabled
   - Relaunch Chrome

2. **Download models:**
   - Click extension icon → "Enable AI models"
   - Follow setup flow (~2GB download)
   - Wait for download completion (5-10 minutes)

3. **Verify:**
   - Extension icon should show "AI Ready"
   - Settings page shows model status

### How do I use cloud AI instead?

1. **Get API key:**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create free API key

2. **Configure extension:**
   - Extension Settings → Cloud AI section
   - Enter API key
   - Select processing mode: Auto, Cloud, or Local

3. **Test:**
   - Download a file
   - Check Settings → Cloud AI → Usage stats

### Can I customize rename patterns?

Currently, rename strategies are pre-configured, but you can:
- Enable/disable specific strategies (Settings → Strategy tab)
- Choose processing mode (manual, local AI, cloud AI)
- Edit suggested names before applying

**Future:** Custom pattern templates and user-defined rules are on the roadmap.

### How do I undo a rename?

1. **Via history:**
   - Extension popup → History tab
   - Find renamed file
   - Click "Undo" button

2. **Via File System:**
   - Manual rename back (if history cleared)

**Note:** Undo requires file still exists at renamed location.

---

## Troubleshooting

### AI models won't download

**Common causes:**
- Insufficient disk space (need ~2GB free)
- Chrome version too old (need 138+)
- Flags not enabled properly
- Optimization Guide blocked

**Solutions:**
1. Check `chrome://components` → "Optimization Guide On Device Model"
2. Click "Check for update"
3. Wait 5-10 minutes (download happens in background)
4. Restart Chrome
5. Check extension diagnostics page

### Downloads not being renamed

**Checklist:**
- [ ] Extension has downloads permission (click icon to grant)
- [ ] File System Access granted for downloads folder
- [ ] AI models downloaded (if using local AI)
- [ ] Processing mode not set to "Manual"
- [ ] File type supported (check Settings → Strategy)

**Debug mode:**
- Settings → Enable debug logging
- Check console: `chrome://extensions` → Inspect background page
- Look for errors in `[NewName]` prefixed logs

### Context not being captured

**Symptoms:**
- AI suggestions don't use page title
- Generic filenames despite meaningful page titles

**Causes:**
- Content script not running (CSP restrictions)
- Tab closed too quickly (<5 min context TTL)
- Page has no title or headings

**Debug:**
1. Inspect page: `chrome://extensions` → Content scripts
2. Check if NewName content script listed
3. Open DevTools → Console → Look for `[NewName]` logs

### "Permission denied" errors

**Cause:** File System Access permission not granted or revoked.

**Solution:**
1. Click extension icon
2. "Grant folder access" button
3. Select Downloads folder
4. Allow permission in Chrome prompt

**Note:** You must grant permission for each Chrome profile separately.

---

## Architecture & Design Decisions

### Why WXT framework?

WXT provides:
- Modern TypeScript + Vite build tooling
- Auto-reload during development
- Multi-browser support (future)
- Type-safe manifest generation
- Content script hot reload

**Alternative considered:** Plain Chrome Extension APIs. Decided WXT improves developer experience significantly.

### Why Manifest V3?

**Required:** Chrome Web Store is deprecating Manifest V2 (June 2025).

**Benefits:**
- Service worker background (more efficient than persistent pages)
- Enhanced security model
- Better performance characteristics

**Challenges:**
- No persistent background page (mitigated with cache strategies)
- Limited `eval()` usage (mitigated with sandboxing)

### Why React 19?

**Features used:**
- Modern concurrent rendering
- Improved hydration (for popup/settings)
- Better TypeScript support
- New hooks (useTransition, useDeferredValue)

**Alternative considered:** Vanilla JS, Preact, Vue. Chose React for ecosystem maturity and team familiarity.

### Why Tailwind CSS v4?

**Benefits:**
- Utility-first approach (fast development)
- Tree-shaking (small bundle size)
- v4 improvements: faster builds, better DX

**Challenges:**
- v4 is beta (may have breaking changes)
- Requires Vite plugin for oxide engine

**Alternative considered:** CSS Modules, Emotion. Chose Tailwind for consistency and speed.

---

## Contributing

### How can I contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code contribution guidelines
- Development setup instructions
- Pull request process
- Issue reporting templates

### I found a bug, what should I do?

1. **Check existing issues:** [GitHub Issues](https://github.com/your-repo/NewName/issues)
2. **Create new issue:** Use bug report template
3. **Include:**
   - Steps to reproduce
   - Expected vs actual behavior
   - Chrome version
   - Extension version
   - Console errors (if any)

### I have a feature request

1. **Check roadmap:** Open GitHub Discussions
2. **Describe use case:** What problem does it solve?
3. **Provide examples:** Show real-world scenarios

---

## Additional Resources

- **Privacy Policy:** [PRIVACY.md](../PRIVACY.md)
- **Development Guide:** [CLAUDE.md](../CLAUDE.md)
- **GitHub:** [Repository](https://github.com/your-repo/NewName)
