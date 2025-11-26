# Privacy Policy for NewName

**Last Updated:** 2025-01-26

**Extension Name:** NewName
**Developer:** [Your Name/Organization]
**Contact:** [GitHub Issues](https://github.com/yuriyward/NewName/issues)

This Privacy Policy describes how NewName ("we", "our", or "the extension") collects, uses, and protects information when you use our Chrome browser extension. By installing and using NewName, you agree to the practices described in this policy.

## Overview

NewName is designed with privacy as a core principle:
- **Local-first processing**: AI analysis runs on your device whenever possible
- **Minimal data collection**: We only collect what's necessary for functionality
- **No tracking or analytics**: We don't monitor your behavior or usage patterns
- **Open source**: Our entire codebase is publicly available for audit

---

**🎯 SINGLE PURPOSE STATEMENT**

NewName's sole purpose is: **Intelligent, context-aware file renaming for Chrome downloads.**

All data collection directly supports this purpose. We do NOT:
- ❌ Sell or share your data with third parties
- ❌ Use data for advertising, profiling, or tracking
- ❌ Collect data for unrelated purposes

---

## Data We Collect

### 1. Page Context (Optional, for AI Features)

To provide intelligent filename suggestions, NewName captures limited page information when you visit websites.

**User Consent Required:**
- You must explicitly consent during setup before any page context is captured
- A detailed disclosure explains what data is collected and why
- You can decline consent and use manual renaming mode instead
- Consent can be revoked anytime in Settings

**What we collect:**
- Page title (`document.title`)
- First heading element (H1-H6)
- Link text when you click download links

**Why we collect it:**
Provides context to AI for generating descriptive filenames. Example: downloading `report.pdf` from "Q4 2023 Financial Report - Acme Corp" suggests `2023-Q4-Acme-Financial-Report.pdf`.

**How we use it:**
- Stored temporarily in browser memory (5-minute maximum)
- Used only for AI rename suggestions
- Automatically deleted after expiration
- Never sent to external servers (except cloud AI, see below)

**Technical details:**
- Implementation: `entrypoints/content.ts:111-112`
- Storage: `entrypoints/shared/state/page-context-store.ts`
- Retention: 5 minutes (`MAX_CONTEXT_AGE_MS`)

### 2. File Metadata

When processing downloads, we analyze:
- File names and extensions
- MIME types
- Download URLs and referrers
- File metadata (for media files: resolution, codec, duration)

**Purpose:** Required for rename analysis and suggestions
**Storage:** Temporary in-memory processing only
**Retention:** Cleared after processing completes

### 3. User Preferences

We store your extension settings locally:
- Enabled/disabled rename strategies
- AI processing mode (local, cloud, or auto)
- Cloud API keys (encrypted)
- Managed folder paths

**Storage:** Browser's local storage via Chrome Extensions API
**Sharing:** Never shared or synced outside your device

### 4. Rename History

We maintain a local history of renamed files:
- Original and new filenames
- Rename timestamps
- Rename source (manual, AI, pattern-based)

**Purpose:** Provides undo functionality and audit trail
**Storage:** Browser's local storage
**Retention:** Configurable, default 30 days
**Control:** You can clear history at any time

## Data We DON'T Collect

❌ Page content or body text
❌ Form data or user inputs
❌ Passwords or credentials
❌ Cookies or session data
❌ Complete browsing history
❌ Personal identification information
❌ Usage analytics or telemetry
❌ Crash reports or diagnostics

## Cloud AI Processing (Optional)

If you enable cloud AI processing (Google Gemini):

**What is sent:**
- File content excerpts for analysis (text, image thumbnails, PDF pages)
- Page context (title, heading) if relevant
- Original filename for comparison

**When:**
- Only when local AI is unavailable or disabled
- Requires explicit user consent via settings
- Can be disabled at any time

**API keys:**
- You provide your own Google Gemini API key
- Stored encrypted in browser storage
- Never transmitted to our servers (we have none)

**Google's privacy policy:**
See [Google AI Studio Privacy](https://ai.google.dev/gemini-api/terms) for how Google processes API requests.

## Local AI Processing

When using Chrome's built-in AI (Gemini Nano):

- **Fully local:** All processing happens on your device
- **No network:** No data sent to external servers
- **Private:** Google cannot see your processed content
- **Model storage:** AI models stored locally (~2GB)

## Browser Permissions

NewName requests specific permissions to provide intelligent file renaming. Each permission is essential for the extension's core functionality.

### Host Permission (`<all_urls>`) - "Read and change all your data on websites you visit"

**What it's for:** Capturing page titles and headings to improve AI rename suggestions.

**What we actually access:**
- ✅ `document.title` - The page title
- ✅ First heading element (H1-H6)
- ✅ Link text when you click download links

**What we DO NOT access:**
- ❌ Page content or body text
- ❌ Form data or user inputs
- ❌ Passwords or credentials
- ❌ Cookies or session data

**Why `<all_urls>` instead of `activeTab`:**
Downloads can start from any website, and there's often a delay between clicking a link and the download beginning. During this time, you might switch tabs. The `activeTab` permission only grants access at the moment of interaction, not ongoing access. We need proactive capture to ensure context is available when the download starts.

**Example of why this matters:**
- You're on "Q4 2023 Financial Report - Acme Corp"
- You click download, then switch to another tab
- 3 seconds later, Chrome starts downloading `report.pdf`
- Without proactive capture, we'd have no context for the AI

**Privacy safeguards:**
- Context stored in-memory only (5-minute TTL)
- Automatically deleted after expiration
- Never sent to external servers (except optional cloud AI)
- No persistent storage of page data

**Alternative:** Disable AI features in Settings → Processing Mode → Manual (deterministic renaming still works without page context)

### Downloads Permission

**What it's for:** Core functionality - intercepting and renaming downloaded files.

**What we access:**
- Download ID, filename, URL, referrer
- MIME type and file size
- Download state (in progress, complete, etc.)

**What we DO NOT access:**
- File contents (requires separate File System Access permission with user consent)

**How we use it:**
- Listen to `chrome.downloads.onDeterminingFilename` to suggest renamed filenames
- Monitor `chrome.downloads.onChanged` to trigger post-download AI analysis

### Storage Permission

**What it's for:** Saving your preferences and extension state locally.

**What we store:**
- Enabled/disabled rename strategies
- AI processing mode (local, cloud, auto)
- Encrypted cloud API keys (if you provide them)
- Rename history for undo functionality
- Onboarding progress

**Privacy guarantee:**
- All data stored locally in your browser
- Never synced to cloud or shared externally
- Cleared completely when you remove the extension

### Offscreen Permission

**What it's for:** Running AI and WASM processing in isolated contexts.

**Why needed:**
- Chrome's built-in AI (Gemini Nano) requires a document context
- MediaInfo.js and MuPDF (WASM libraries) need document contexts
- Service workers in Manifest V3 cannot run these APIs directly

**What it does:**
- Creates invisible document for AI processing
- Hosts sandboxed iframe for MediaInfo.js (requires `unsafe-eval`)
- Enables heavy processing without blocking the extension

### Alarms Permission

**What it's for:** Scheduling background maintenance tasks.

**What we schedule:**
- Cache cleanup (purge expired page context data)
- AI model status polling (check availability)
- Upgrade analysis queue (process completed downloads)

**Why needed:**
- `setTimeout`/`setInterval` don't persist across service worker restarts
- Alarms API is the only reliable scheduling mechanism in Manifest V3

### System Memory Permission

**What it's for:** Checking available RAM before downloading AI models.

**What we access:**
- `chrome.system.memory.getInfo()` - total and available memory

**When we use it:**
- Once during AI model setup flow
- To warn if your system may not support local AI (~2GB required)

**Privacy guarantee:**
- Memory info used locally only for compatibility checks
- Never transmitted or stored persistently

## How Data Collection Works (Quick Summary)

NewName works in two stages:

**Stage 1 - Automatic (with Consent):**
- When you visit any webpage, NewName's content script captures the page title and first heading
- **Important:** This only happens AFTER you grant explicit consent during setup
- Context is stored temporarily (5 minutes max) in browser memory
- Used to provide better filename suggestions when you download files from that page

**Stage 2 - On Download:**
- When you download a file, NewName uses the cached page context + file content to suggest a better filename
- For local AI: All processing happens on your device
- For cloud AI: Requires explicit consent before sending data

**To disable automatic context capture:** During setup, decline consent for page context capture, or later revoke consent in Settings → Processing Mode → Manual

## Data Sharing

We do **NOT** share, sell, or transmit your data to any third parties, with these exceptions:

1. **Cloud AI providers** (only if you enable cloud mode and provide API keys)
   - Google Gemini: For AI processing when local AI unavailable
   - You control this via settings

2. **Open source contributions**
   - If you submit bug reports or feature requests on GitHub
   - Only information you explicitly provide in issues/PRs

## Chrome Web Store Compliance Certifications

NewName certifies compliance with Chrome Web Store Developer Program Policies:

### ✅ We do not sell or transfer user data to third parties

- **No data sales**: We have no business model involving user data
- **No third-party transfers**: User data is never sent to third parties
- **No backend servers**: We operate no servers that could receive user data
- **Exception**: Cloud AI (Google Gemini) only when user explicitly enables it with their own API key

### ✅ We do not use or transfer user data for purposes unrelated to the extension's single purpose

NewName's single purpose: **Intelligent, context-aware file renaming for Chrome downloads.**

All data collection directly supports this purpose:
- Page titles → Context for AI filename suggestions
- File content → Analyzed to understand file for naming
- User settings → Stores renaming preferences
- Rename history → Enables undo functionality

We do NOT use data for advertising, profiling, tracking, or analytics.

### ✅ We do not use or transfer user data to determine creditworthiness or for lending purposes

NewName has no involvement with credit scoring, lending decisions, or financial services. This is a file renaming utility with no connection to financial evaluation.

## Your Rights & Controls

### Disable Page Context Capture

To completely stop page context collection:
1. Open Settings → Processing Mode
2. Select "Manual (no AI)" mode
3. This disables all AI features and stops page context capture

Alternative: Uninstall the extension to immediately stop all data collection.

### Disable Data Collection

- **Disable AI features:** Settings → Processing Mode → Manual
- **Clear history:** Extension popup → History tab → Clear all
- **Remove extension:** Completely deletes all local data

### Review Data

- **View history:** Extension popup → History tab
- **Inspect settings:** Settings page shows all stored preferences
- **Debug mode:** Enable in settings to see all data flows (for developers)

### Data Portability

- All data stored locally in your browser
- You can export history via browser DevTools (chrome://extensions → Inspect)
- No vendor lock-in - data stays with you

## Security Measures

### Encryption

- API keys encrypted using Web Crypto API (AES-GCM)
- Encryption keys derived from extension ID + salt
- Note: This is obfuscation, not cryptographic security (browser extensions lack secure key storage)

### Sandboxing

- Heavy processing (WASM, AI) runs in isolated contexts
- Content scripts have minimal access
- Background service worker operates with strict CSP

### Regular Audits

- Open source code available for community review
- Security researchers welcome to audit
- Report vulnerabilities via GitHub security advisories

## Children's Privacy

NewName is not directed at children under 13. We do not knowingly collect information from children. If you believe a child has used this extension, please contact us.

## Changes to This Policy

We may update this privacy policy as features evolve. Changes will be:
- Documented in Git history
- Announced via extension updates
- Reflected in "Last Updated" date above

Significant changes will be communicated via update notes in Chrome Web Store listing.

## International Users

NewName operates entirely locally in your browser. No data crosses borders unless you:
- Enable cloud AI with providers in other jurisdictions
- Submit issues/PRs to our GitHub (hosted in USA)

## Contact & Questions

- **GitHub Issues:** [Repository issues](https://github.com/your-repo/NewName/issues)
- **Security Reports:** Use GitHub security advisories
- **General Questions:** Open a discussion on GitHub

## Third-Party Services

NewName may interact with:

### Optional Services (User-Enabled)

- **Google Gemini API** (cloud AI): Subject to Google's terms
- **Chrome Built-in AI** (Gemini Nano): Subject to Chrome's terms

### Development Dependencies

- **MediaInfo.js**: Media file analysis (runs locally via WASM)
- **MuPDF**: PDF rendering (runs locally via WASM)
- **WXT Framework**: Extension build tooling (development only)

## Open Source

NewName is open source under MIT license:
- Source code: [GitHub repository](https://github.com/yuriyward/NewName/)
- Review implementation: All code publicly auditable
- Contribute: Pull requests welcome
- Build yourself: Verify no hidden behavior

## Policy Updates

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Updating the "Last Updated" date at the top of this policy
- Posting the new Privacy Policy on our GitHub repository
- Including update notes in Chrome Web Store listing for significant changes

Your continued use of the extension after any changes indicates your acceptance of the updated Privacy Policy.

## Consent

By using NewName, you consent to:
- Collection of page titles and headings for AI-powered filename suggestions
- Local storage of your preferences and rename history
- Optional cloud AI processing if you explicitly enable it

You can withdraw consent at any time by:
- Disabling AI features in Settings
- Clearing your history
- Uninstalling the extension

## Legal Basis for Processing (GDPR)

For users in the European Economic Area, our legal basis for processing data is:
- **Legitimate interest**: Providing the core file renaming functionality you installed the extension for
- **Consent**: For optional features like cloud AI processing

## Contact Us

If you have questions about this Privacy Policy or our data practices:
- **GitHub Issues:** [https://github.com/yuriyward/NewName/issues](https://github.com/yuriyward/NewName/issues)
- **Security Reports:** Use GitHub Security Advisories

---

**Summary:** NewName collects minimal data (page titles, file metadata) solely for providing intelligent rename suggestions. All processing is local by default. No tracking, no analytics, no external servers. You maintain full control over your data.

---

*This Privacy Policy is effective as of January 26, 2025.*
