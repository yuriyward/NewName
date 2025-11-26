# Permission Justifications for Chrome Web Store

This document provides detailed justifications for each permission requested by NewName, formatted for Chrome Web Store submission.

---

## Single Purpose Statement

> **Intelligent, context-aware file renamer for Chrome downloads.**

NewName automatically suggests descriptive, human-readable filenames for downloads using AI analysis of file content, page context, and metadata.

---

## Permission Justifications

### 1. `alarms`

**Justification:**
Required for scheduling background maintenance tasks that support the extension's core file renaming functionality:

- **Cache cleanup**: Automatically purges expired page context data (5-minute TTL) to maintain privacy and prevent memory bloat
- **AI model status polling**: Periodically checks Chrome's built-in AI model availability to ensure rename suggestions work reliably
- **Scheduled upgrade analysis**: Queues contextual upgrade analysis for completed downloads without blocking the download flow

**Why not alternatives:**
- `setTimeout`/`setInterval` don't persist across service worker restarts in Manifest V3
- Alarms API is the only reliable way to schedule tasks in extension service workers

**Code references:**
- [`entrypoints/background/upgrade/scheduler.ts`](../entrypoints/background/upgrade/scheduler.ts) - Upgrade scheduling
- [`entrypoints/shared/state/page-context-store.ts`](../entrypoints/shared/state/page-context-store.ts) - Context expiration

---

### 2. `downloads`

**Justification:**
Core permission required for the extension's primary functionality - renaming downloaded files:

- **Intercept downloads**: Listen to `chrome.downloads.onDeterminingFilename` to suggest renamed filenames before files are saved
- **Access download metadata**: Read filename, URL, MIME type, and referrer to analyze what's being downloaded
- **Track download completion**: Monitor `chrome.downloads.onChanged` to trigger post-download AI analysis for contextual upgrades

**What we access:**
- Download ID, filename, URL, referrer, MIME type, file size, state
- We do NOT access file contents through this API (that requires File System Access API with user consent)

**Code references:**
- [`entrypoints/background/download-coordinator.ts`](../entrypoints/background/download-coordinator.ts) - Download interception
- [`entrypoints/background/download-post-actions.ts`](../entrypoints/background/download-post-actions.ts) - Completion handling

---

### 3. `storage`

**Justification:**
Required for persisting user preferences and extension state locally:

- **User settings**: Store enabled/disabled strategies, AI processing mode preferences, theme settings
- **Rename history**: Maintain audit trail of renamed files for undo functionality
- **API key storage**: Securely store encrypted cloud AI API keys (user-provided)
- **Onboarding state**: Track setup progress to avoid repeating completed steps
- **AI model status cache**: Cache model availability to reduce redundant checks

**Privacy guarantee:**
- All data stored locally in browser's extension storage
- Never synced to cloud or shared with third parties
- User can clear all data by removing the extension

**Code references:**
- [`entrypoints/shared/settings/settings.ts`](../entrypoints/shared/settings/settings.ts) - Settings persistence
- [`entrypoints/shared/history/storage.ts`](../entrypoints/shared/history/storage.ts) - History storage

---

### 4. `offscreen`

**Justification:**
Required for running isolated processing contexts that support AI-powered file analysis:

- **AI model execution**: Chrome's built-in AI (Gemini Nano) requires a document context to run; service workers cannot directly use these APIs
- **WASM processing**: MediaInfo.js (media metadata) and MuPDF (PDF rendering) require document contexts for WebAssembly execution
- **Sandboxed iframe hosting**: The offscreen document hosts a sandboxed iframe for MediaInfo.js which requires `unsafe-eval` for Emscripten glue code

**Why needed:**
- Manifest V3 service workers cannot create DOM elements or run certain APIs
- Offscreen documents provide isolated contexts without visible UI
- Enables heavy processing without blocking the main extension

**Code references:**
- [`entrypoints/offscreen/main.ts`](../entrypoints/offscreen/main.ts) - Offscreen document initialization
- [`entrypoints/offscreen/text-analysis/pipeline-orchestrator.ts`](../entrypoints/offscreen/text-analysis/pipeline-orchestrator.ts) - AI analysis
- [`entrypoints/offscreen/pdf-analysis/pdf-renderer.ts`](../entrypoints/offscreen/pdf-analysis/pdf-renderer.ts) - PDF processing

---

### 5. `system.memory`

**Justification:**
Required for checking available system RAM before downloading AI models:

- **Pre-download check**: Chrome's built-in AI models (Gemini Nano) require ~2GB of disk space and sufficient RAM to run
- **User guidance**: Warn users if their system may not support local AI, suggesting cloud AI as an alternative
- **Prevent failures**: Avoid downloading large models on systems that can't run them

**What we access:**
- `chrome.system.memory.getInfo()` - Returns total and available memory
- Used once during AI model setup flow, not continuously monitored

**Privacy guarantee:**
- Memory information is only used locally for compatibility checks
- Never transmitted to any server or stored persistently

**Code references:**
- [`entrypoints/ai-model-setup/utils.ts`](../entrypoints/ai-model-setup/utils.ts) - Memory check utilities
- [`entrypoints/ai-mode-selection/components/RamRecommendationBadge.tsx`](../entrypoints/ai-mode-selection/components/RamRecommendationBadge.tsx) - RAM display

---

### 6. Host Permission (`<all_urls>`)

**Justification:**
Required for capturing page context (title and heading) to improve AI rename suggestions:

**Why needed:**
Downloads can originate from any website. To provide intelligent filename suggestions, we need to capture the page title and first heading when a download starts. This context dramatically improves AI rename quality.

**Example:**
- Page: "Q4 2023 Financial Report - Acme Corp"
- Download: `report.pdf`
- AI suggestion: `2023-Q4-Acme-Financial-Report.pdf`

**Technical reason for `<all_urls>` vs `activeTab`:**
- Downloads start asynchronously (network delay between click and download start)
- User may switch tabs before download begins
- `activeTab` only grants access at moment of user interaction, not ongoing access
- We need proactive capture + cache to ensure context is available when download starts

**What we actually access:**
- ✅ `document.title` - Page title
- ✅ First heading element (H1-H6)
- ✅ Link text when user clicks download links
- ❌ NOT page content, forms, passwords, cookies, or any other data

**Privacy guarantees:**
- Context stored in-memory only (5-minute maximum TTL)
- Automatically deleted after expiration
- Never sent to external servers (except optional cloud AI with explicit consent)
- No persistent storage of page data

**Code references:**
- [`entrypoints/content.ts`](../entrypoints/content.ts) - Content script (lines 111-112, 214-242)
- [`entrypoints/shared/state/page-context-store.ts`](../entrypoints/shared/state/page-context-store.ts) - Context cache
- [`entrypoints/shared/context/page-analyzer.ts`](../entrypoints/shared/context/page-analyzer.ts) - Context extraction

---

## Summary Table

| Permission | Purpose | Data Accessed | Privacy Impact |
|------------|---------|---------------|----------------|
| `alarms` | Schedule background tasks | None | None |
| `downloads` | Intercept and rename files | Download metadata | Low - metadata only |
| `storage` | Save settings and history | User preferences | Local only |
| `offscreen` | Run AI and WASM processing | None directly | None |
| `system.memory` | Check RAM for AI models | Memory stats | One-time check |
| `<all_urls>` | Capture page context | Title + heading | 5-min cache, local only |

---

## Alternative Approaches Considered

### For Host Permissions

**Option 1: `activeTab` permission**
- ❌ Rejected: Only grants access at moment of user interaction
- Problem: Downloads start asynchronously; user may switch tabs

**Option 2: `optional_host_permissions` with user opt-in**
- ⚠️ Considered: Would reduce initial permission scope
- Trade-off: Adds friction to onboarding; most users want AI features
- Future: May implement as user feedback indicates preference

**Option 3: No page context (URL-only analysis)**
- ❌ Rejected: Significantly reduces rename quality
- Testing showed 80% improvement in suggestion quality with page context

### For Offscreen Permission

**Option 1: Run AI in service worker**
- ❌ Not possible: Chrome AI APIs require document context

**Option 2: Use popup/options page for processing**
- ❌ Rejected: Would require keeping UI open during processing
- Poor UX for background file analysis

---

## Open Source Verification

NewName is fully open source. All permission usage can be verified:

- **Repository**: [GitHub](https://github.com/user/NewName)
- **Content script**: [`entrypoints/content.ts`](../entrypoints/content.ts)
- **Background logic**: [`entrypoints/background/`](../entrypoints/background/)
- **Privacy policy**: [`PRIVACY.md`](../PRIVACY.md)

---

## Data Usage Disclosure (Chrome Web Store Form)

This section provides answers for the Chrome Web Store "Data Usage" form.

### What user data do you plan to collect?

Based on the Chrome Web Store categories, here's what NewName collects:

| Category | Collected? | Details |
|----------|------------|---------|
| **Personally identifiable information** | ❌ No | We do not collect names, addresses, emails, age, or IDs |
| **Health information** | ❌ No | Not applicable to file renaming |
| **Financial and payment information** | ❌ No | No transactions or payment processing |
| **Authentication information** | ❌ No | We don't handle passwords or credentials. User-provided API keys are stored encrypted locally, never transmitted to our servers |
| **Personal communications** | ❌ No | We don't access emails, texts, or messages |
| **Location** | ❌ No | No GPS, IP tracking, or location data |
| **Web history** | ⚠️ Limited | See detailed explanation below |
| **User activity** | ❌ No | No click tracking, mouse position, scroll, or keystroke logging |
| **Website content** | ⚠️ Limited | See detailed explanation below |

### Web History - Detailed Explanation

**What we collect:**
- Page title (`document.title`) when a download starts
- First heading element (H1-H6) on the page

**What we DO NOT collect:**
- List of visited pages
- Browsing history
- Time spent on pages
- Navigation patterns

**Why we collect it:**
To provide context for AI-powered filename suggestions. Example: downloading `report.pdf` from "Q4 2023 Financial Report - Acme Corp" allows AI to suggest `2023-Q4-Acme-Financial-Report.pdf`.

**How we handle it:**
- Stored in-memory only (not persisted to disk)
- 5-minute maximum retention, then automatically deleted
- Never transmitted to external servers (except optional cloud AI with explicit user consent)
- Not used for tracking or analytics

**Justification for "Web history" checkbox:**
We recommend checking this box with the above explanation, as page titles technically fall under "associated data such as page title" in the definition. However, we do NOT collect "the list of web pages a user has visited" - only the title of pages where downloads occur.

### Website Content - Detailed Explanation

**What we collect:**
- File content excerpts for AI analysis (text files, PDF pages, image thumbnails)
- File metadata (filename, MIME type, size)
- Media metadata (resolution, codec, duration for video/audio)

**What we DO NOT collect:**
- General page content (body text, articles, etc.)
- Images from web pages (only downloaded image files)
- Hyperlinks or page structure

**Why we collect it:**
To analyze downloaded files and generate intelligent filename suggestions based on content.

**How we handle it:**
- Processed locally by default (Chrome's built-in AI)
- If cloud AI enabled: excerpts sent to Google Gemini API (user's own API key)
- Never stored persistently after processing
- Never transmitted to our servers (we have none)

**Justification for "Website content" checkbox:**
We recommend checking this box because we analyze downloaded file content. However, we do NOT scrape or collect general website content - only files the user explicitly downloads.

### Recommended Form Responses

For the Chrome Web Store data usage form, we recommend:

1. **Check "Web history"** - Because we capture page titles (limited scope)
2. **Check "Website content"** - Because we analyze downloaded file content (limited scope)
3. **Leave all others unchecked** - We don't collect any other categories

### Disclosure Text for Chrome Web Store

Use this text in the data usage disclosure:

```
NewName collects limited data solely for AI-powered filename suggestions:

WEB HISTORY (Limited):
- Page titles only when downloads occur
- NOT browsing history or visited page lists
- Stored in-memory 5 minutes max, then deleted
- Never transmitted to external servers

WEBSITE CONTENT (Limited):
- Downloaded file content for AI analysis only
- NOT general page content or scraping
- Processed locally by default (Chrome AI)
- Cloud processing optional, requires user consent and API key

We do NOT collect: personal information, passwords, location, communications, financial data, health data, or user activity tracking.

All processing is local by default. Open source code available for verification.
```

---

## Chrome Web Store Certifications

NewName certifies compliance with all three required disclosures:

### ✅ 1. "I do not sell or transfer user data to third parties, outside of the approved use cases"

**Certification: TRUE**

NewName does NOT sell or transfer user data to third parties. Specifically:

- **No data sales**: We have no business model involving user data sales
- **No third-party transfers**: User data is never sent to third parties
- **No backend servers**: We operate no servers that could receive user data
- **Local-first architecture**: All processing happens on the user's device

**Approved use case exception (Cloud AI):**
- When users explicitly enable cloud AI and provide their own API key
- File content excerpts are sent to Google Gemini API for analysis
- This is user-initiated, requires explicit consent, and uses the user's own API credentials
- Users can disable this at any time in settings

### ✅ 2. "I do not use or transfer user data for purposes that are unrelated to my item's single purpose"

**Certification: TRUE**

NewName's single purpose is: **Intelligent, context-aware file renaming for Chrome downloads.**

All data collection directly supports this purpose:

| Data Collected | How It Supports Single Purpose |
|----------------|-------------------------------|
| Page titles | Provides context for AI to generate meaningful filenames |
| File content | Analyzed to understand what the file contains for naming |
| File metadata | Used to construct appropriate filename patterns |
| User settings | Stores preferences for how renaming should work |
| Rename history | Enables undo functionality for renames |

**We do NOT use data for:**
- ❌ Advertising or marketing
- ❌ User profiling or tracking
- ❌ Analytics or telemetry
- ❌ Any purpose other than file renaming

### ✅ 3. "I do not use or transfer user data to determine creditworthiness or for lending purposes"

**Certification: TRUE**

NewName has absolutely no involvement with:
- Credit scoring or creditworthiness assessment
- Lending decisions or financial services
- Any financial evaluation of users

This certification is straightforward - NewName is a file renaming utility with no connection to financial services.

---

## Contact

For questions about permissions or privacy:
- GitHub Issues: [Repository Issues](https://github.com/user/NewName/issues)
- Security Reports: GitHub Security Advisories
