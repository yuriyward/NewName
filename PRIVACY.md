# Privacy Policy

**Last Updated:** 2025-01-25

NewName is committed to protecting your privacy. This document explains what data we collect, how we use it, and your rights regarding your information.

## Overview

NewName is designed with privacy as a core principle:
- **Local-first processing**: AI analysis runs on your device whenever possible
- **Minimal data collection**: We only collect what's necessary for functionality
- **No tracking or analytics**: We don't monitor your behavior or usage patterns
- **Open source**: Our entire codebase is publicly available for audit

## Data We Collect

### 1. Page Context (Optional, for AI Features)

To provide intelligent filename suggestions, NewName captures limited page information when you visit websites:

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

### "Read and change all your data on websites you visit"

**Required for:** Page context capture (title and headings)
**Actual access:** Only document.title and first heading element
**Cannot access:** Page content, passwords, forms, or sensitive data
**Implementation:** Content script runs on all pages to capture context proactively

**Why needed:** Downloads can happen from any website, and context improves AI suggestions by 80%. User may switch tabs before download completes, so proactive capture is required.

**Alternative:** You can disable AI features to avoid this permission (manual renaming still works)

### "Downloads" Permission

**Required for:** Accessing Chrome's downloads API
**Purpose:** Intercept downloads and suggest renamed filenames
**Access:** Download metadata only (URLs, names, MIME types)

### "Storage" Permission

**Required for:** Saving preferences and history locally
**Purpose:** Store settings, API keys, and rename history
**Scope:** Local browser storage only, never synced

### Other Permissions

- **Offscreen**: For isolated AI and WASM processing contexts
- **Alarms**: For scheduled background tasks (cache cleanup)
- **System memory**: For checking available RAM before downloading AI models

## Data Sharing

We do **NOT** share, sell, or transmit your data to any third parties, with these exceptions:

1. **Cloud AI providers** (only if you enable cloud mode and provide API keys)
   - Google Gemini: For AI processing when local AI unavailable
   - You control this via settings

2. **Open source contributions**
   - If you submit bug reports or feature requests on GitHub
   - Only information you explicitly provide in issues/PRs

## Your Rights & Controls

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
- Source code: [GitHub repository](https://github.com/your-repo/NewName)
- Review implementation: All code publicly auditable
- Contribute: Pull requests welcome
- Build yourself: Verify no hidden behavior

---

**Summary:** NewName collects minimal data (page titles, file metadata) solely for providing intelligent rename suggestions. All processing is local by default. No tracking, no analytics, no external servers. You maintain full control over your data.
