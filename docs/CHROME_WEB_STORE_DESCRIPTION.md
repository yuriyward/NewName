# Chrome Web Store Listing - Description Template

This document provides templates for your Chrome Web Store listing description. Choose the version that best fits your target audience.

---

## Short Version (Recommended)

Use this for the initial listing description - focuses on benefits first, privacy second.

```markdown
# NewName - AI-Powered File Renaming

Transform cryptic download names into descriptive, human-readable filenames automatically.

## ✨ Key Features

- **AI-Powered Intelligence**: Uses Chrome's built-in Gemini Nano for smart filename suggestions
- **Context-Aware**: Analyzes page titles, file content, and metadata
- **Privacy-First**: All AI processing happens on your device by default
- **Multi-Format Support**: Handles text, PDFs, images, videos, and more
- **One-Click Undo**: Full history with easy revert

## 🎯 How It Works

1. Download a file from any website
2. NewName analyzes the page title and file content
3. Get an intelligent filename suggestion instantly
4. Accept, edit, or let it auto-apply

**Example:**
- Page: "Q4 2023 Financial Report - Acme Corp"
- Download: `report.pdf`
- NewName: `2023-Q4-Acme-Financial-Report.pdf`

## 🔒 Privacy & Transparency

- **Minimal data access**: Only page titles and headings
- **Local processing**: AI runs on your device
- **No tracking**: We don't collect usage data
- **Open source**: Verify our code on GitHub

See complete privacy policy: [GitHub/NewName/PRIVACY.md]

## 🚀 Getting Started

1. Install the extension
2. Grant downloads folder access
3. Enable Chrome AI models (optional, ~2GB)
4. Start downloading - that's it!

**Requirements**: Chrome 138+ for local AI features

## 📖 Learn More

- [Privacy Policy](https://github.com/your-repo/NewName/blob/main/PRIVACY.md)
- [FAQ](https://github.com/your-repo/NewName/blob/main/docs/FAQ.md)
- [GitHub Repository](https://github.com/your-repo/NewName)
```

---

## Long Version (Comprehensive)

Use this if you want to provide extensive details upfront.

```markdown
# NewName - Intelligent File Renaming for Chrome

Stop wasting time manually renaming downloads. NewName uses AI to automatically suggest descriptive, human-readable filenames based on page context and file content.

## 🎯 The Problem We Solve

Every day, millions of files are downloaded with cryptic names:
- `Screenshot_2024_01_15_at_3.42.18_PM.png`
- `invoice_final_v3_FINAL_2.pdf`
- `IMG_20240315_093847.jpg`
- `document (1).docx`

These names waste time, reduce productivity, and make finding files nearly impossible.

## ✨ Core Features

### 🤖 AI-Powered Intelligence

- **Local AI (Gemini Nano)**: Privacy-focused, on-device processing
- **Cloud AI Fallback**: Optional Google Gemini API for enhanced analysis
- **Multi-Modal**: Analyzes text, images, PDFs, and media files
- **Context-Aware**: Uses page titles and file content for smart suggestions

### ⚡ Smart Automation

- **Two-Phase Pipeline**: Instant baseline + optional AI upgrade
- **Interactive Confirmation**: In-page toasts with preview and edit
- **Auto-Apply**: Optional countdown for hands-free operation
- **Intelligent Detection**: Skips well-named files automatically

### 🔧 Technical Excellence

- **File System Access API**: Post-download renaming support
- **MediaInfo.js**: Media metadata extraction (resolution, codecs, duration)
- **MuPDF**: PDF content analysis and title extraction
- **Full History**: Complete audit trail with one-click undo

## 🔒 Privacy & Security

### Why "Read all your data" Permission?

**Short answer**: To capture page titles for better AI suggestions.

**Technical explanation**: When you download a file, NewName captures the page title and first heading to provide context to AI. Downloads can happen seconds after you click (network delay), and you may switch tabs in the meantime. We use proactive capture + cache to ensure context is available.

**Real example:**
- Page: "Q4 2023 Financial Report - Acme Corp"
- Download: `report.pdf`
- AI Result: `2023-Q4-Acme-Financial-Report.pdf`

### What We Actually Access

✅ **We DO collect:**
- Page title (`document.title`)
- First heading (H1-H6)
- Link text when you click download links

❌ **We DO NOT collect:**
- Page content or body text
- Form data or passwords
- Cookies or browsing history
- Any personally identifiable information

### Privacy Guarantees

- **Where**: In-memory cache in your browser only (no servers)
- **How long**: 5 minutes maximum, then automatically deleted
- **Sharing**: Never shared with third parties
- **Processing**: Everything runs locally by default

### Local AI Processing

Uses Chrome's built-in Gemini Nano:
- Fully on-device processing
- No network calls for AI analysis
- Your files never leave your computer
- Google cannot see your processed content

### Optional Cloud AI

If you enable cloud AI (requires your API key):
- Explicit user consent required
- You provide your own Google Gemini API key
- Control when it's used via settings
- Can be disabled at any time

### Open Source Transparency

- Full source code on GitHub
- Any developer can audit our code
- Verify no malicious behavior
- Build from source yourself

## 🚀 Getting Started

### Requirements

- Chrome 138+ (for local AI support)
- ~2GB disk space (if using local AI models)

### Installation

1. **Install extension**: Click "Add to Chrome"
2. **Grant permissions**: Downloads folder access when prompted
3. **Enable AI models** (optional):
   - Navigate to extension settings
   - Follow AI model setup flow
   - ~2GB download, takes 5-10 minutes

### Quick Start

1. Download any file from the web
2. See intelligent rename suggestion
3. Accept, edit, or let auto-apply
4. View history and undo anytime

## 📚 Documentation

- **Privacy Policy**: [Complete privacy details](https://github.com/your-repo/NewName/blob/main/PRIVACY.md)
- **FAQ**: [Common questions answered](https://github.com/your-repo/NewName/blob/main/docs/FAQ.md)
- **GitHub**: [View source code](https://github.com/your-repo/NewName)

## 🤝 Open Source

NewName is fully open source under MIT license:
- Report issues on GitHub
- Contribute improvements
- Build custom versions
- Verify security claims

## 📊 Comparison

Unlike other rename extensions that use simple pattern matching:
- **AI-powered**: Multimodal content understanding
- **Context-aware**: Uses page titles for 80% better results
- **Local-first**: Privacy-focused on-device processing
- **Multi-format**: Handles text, images, PDFs, media

## 💡 Example Use Cases

- **Research**: PDFs with descriptive academic titles
- **Media**: Videos named by title and resolution
- **Screenshots**: Contextual names based on webpage
- **Downloads**: Documents organized by content
```

---

## Privacy & Permissions Section

Add this section to explain permissions clearly:

```markdown
## 🔒 Privacy & Permissions

### Why "Read all your data on websites"?

We capture page titles when you download files for AI-powered filename suggestions. Downloads can happen from any website, and there's often a delay between clicking and downloading - you might switch tabs. We need proactive capture to ensure context is available.

**Example:**
- Page: "Q4 2023 Financial Report - Acme Corp"
- Download: `report.pdf`
- AI Result: `2023-Q4-Acme-Financial-Report.pdf`

**What we access:**
- ✅ Page title and first heading only
- ❌ NOT page content, passwords, forms, or cookies

### Permission Summary

| Permission | Why We Need It |
|------------|----------------|
| **Downloads** | Intercept downloads to suggest renamed filenames |
| **Storage** | Save your settings and rename history locally |
| **Offscreen** | Run AI and WASM processing in isolated contexts |
| **Alarms** | Schedule background tasks (cache cleanup, AI checks) |
| **System Memory** | Check RAM before downloading AI models (~2GB) |
| **Host (`<all_urls>`)** | Capture page titles for AI context |

### Privacy Guarantees

- **Local-first**: AI runs on your device by default
- **Temporary storage**: Page context cached 5 minutes max
- **No tracking**: We don't collect usage analytics
- **No servers**: We have no backend - everything stays local
- **Open source**: Verify our code on GitHub

[Complete Privacy Policy](https://github.com/your-repo/NewName/blob/main/PRIVACY.md)
[Permission Details](https://github.com/your-repo/NewName/blob/main/docs/PERMISSIONS.md)
```

---

## Instructions

1. **Choose version**: Short (quick adoption) vs Long (comprehensive)
2. **Update links**: Replace `your-repo/NewName` with actual GitHub URL
3. **Log in**: Chrome Web Store Developer Dashboard
4. **Edit listing**: Navigate to your extension
5. **Paste description**: Copy chosen version
6. **Review**: Ensure formatting renders correctly
7. **Submit**: Save and submit for review

## Tips

- **Lead with benefits**: Users care about what it does for them
- **Privacy second**: Address concerns but don't lead with apologies
- **Be specific**: Show real examples of value
- **Link to docs**: Let users dive deeper if interested
- **Keep updated**: Maintain as features evolve
