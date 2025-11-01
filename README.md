# NewName 🤖✨

> **Intelligent, context-aware file renaming for Chrome downloads**
> Powered by local AI (Gemini Nano) with cloud fallback — automatically transform messy filenames into descriptive, human-readable names

[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)](https://github.com/yourusername/newname)
[![Chrome](https://img.shields.io/badge/Chrome-138+-green.svg)](https://www.google.com/chrome/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

<!-- 📹 Demo video/GIF placeholder - Add a compelling demo showing the extension in action -->
**[Demo Video/GIF Coming Soon]**

---

## 🎯 The Problem

Every day, millions of files are downloaded with cryptic, meaningless names:
- `Screenshot_2024_01_15_at_3.42.18_PM.png`
- `invoice_final_v3_FINAL_2.pdf`
- `IMG_20240315_093847.jpg`
- `document (1).docx`

These names waste time, reduce productivity, and make finding files later nearly impossible.

## 💡 The Solution

**NewName** is a Chrome extension that intelligently analyzes your downloads and automatically suggests descriptive, human-readable filenames — **all powered by AI that runs locally on your device** for privacy and speed.

### What Makes NewName Different?

🔒 **Privacy-First AI**: Uses Chrome's built-in Gemini Nano for on-device processing — your files never leave your computer
⚡ **Smart Fallback**: Seamlessly switches to cloud AI (Google Gemini) when local models aren't available
🎯 **Context-Aware**: Analyzes file content, page context, and metadata to generate meaningful names
🚀 **Two-Phase Pipeline**: Instant baseline renaming + optional AI-powered contextual upgrades
🎨 **Multi-Modal**: Handles text, images, PDFs, and media files with specialized analysis

---

## ✨ Current Features

### 🤖 AI-Powered Intelligence

The core innovation of NewName lies in its intelligent AI processing:

- **Local Chrome AI (Gemini Nano)**: Privacy-focused, on-device processing for text analysis, content extraction, and rename decisions
- **Cloud AI Fallback**: Automatic fallback to Google Gemini when local models aren't available or for enhanced analysis
- **Multi-Modal Analysis**:
  - 📝 **Text files**: Content summarization and language detection
  - 📄 **PDFs**: Title extraction and content analysis
  - 📸 **Images**: Visual content description and metadata extraction
  - 🎬 **Media files**: Metadata parsing via MediaInfo.js (codecs, resolution, duration)
- **Context-Aware Decisions**: Analyzes page context, download source, and file metadata to determine if renaming is needed
- **Smart Templates**: AI-generated filenames follow consistent patterns while adapting to content type

### ⚡ Smart Automation

- **Two-Phase Rename Pipeline**:
  - **Phase 1 - Instant Baseline**: Deterministic, synchronous strategies for immediate results
  - **Phase 2 - Contextual Upgrade**: Asynchronous AI analysis for enhanced, context-aware names
- **Intelligent Detection**: Automatically identifies which files need renaming (skips well-named files)
- **Interactive Confirmation**: In-page toast notifications with preview, edit, and undo options
- **Auto-Apply with Countdown**: Optional auto-apply after countdown for hands-free operation
- **File System Integration**: Post-download renaming via File System Access API

### 🔧 Technical Innovation

- **File System Access API**: Modern browser API for reliable post-download file operations
- **MediaInfo.js Integration**: WASM-based media analysis for videos and audio files
- **MuPDF Integration**: PDF rendering and text extraction for document analysis
- **Offscreen Document Architecture**: Isolated contexts for heavy processing (AI, WASM)
- **Scoped Rules**: Per-folder and per-project configuration support
- **Activity History**: Complete audit trail with metadata and timestamps

---

## 📸 Screenshots

<!-- Screenshot placeholder 1: Extension popup -->
**Extension Popup - Strategy Configuration**
*[Screenshot showing the popup interface with strategy toggles and history view]*

---

<!-- Screenshot placeholder 2: In-page toast -->
**Interactive Confirmation Toast**
*[Screenshot showing the in-page toast with filename preview and action buttons]*

---

<!-- Screenshot placeholder 3: History view -->
**Rename History with One-Click Undo**
*[Screenshot showing the history tab with past renames and revert options]*

---

<!-- Screenshot placeholder 4: AI setup -->
**AI Model Setup Flow**
*[Screenshot showing the AI model onboarding and download progress]*

---

## 🚀 Installation

### Requirements

- **Chrome 138+** (required for Gemini Nano support)
- **~2GB disk space** (if using local AI models)

### Install the Extension

1. **Download the latest release**:
   - Visit the [Chrome Web Store](#) *(coming soon)*
   - Or download from [Releases](https://github.com/yourusername/newname/releases)

2. **Load the extension**:
   - For Chrome Web Store: Click "Add to Chrome"
   - For manual install:
     - Open `chrome://extensions/`
     - Enable "Developer mode"
     - Click "Load unpacked"
     - Select the extension folder

3. **Grant permissions**:
   - Click the extension icon
   - Grant Downloads folder access when prompted
   - This allows the extension to rename files after download

### Enable Local AI Models

For the best privacy and performance, enable Chrome's built-in AI:

1. **Enable Chrome flags**:
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
   - Set to "Enabled"
   - Navigate to `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled"
   - Navigate to `chrome://flags/#translation-api`
   - Set to "Enabled"
   - Click "Relaunch"

2. **Download AI models**:
   - Click the extension icon
   - Click "Enable AI models"
   - Follow the setup flow (~2GB download)
   - Model download may take several minutes

3. **Verify setup**:
   - Visit `chrome://on-device-internals`
   - Check that models are listed in "Model Status" tab

**Note**: If local AI isn't available, the extension automatically falls back to cloud AI with your consent.

---

## 🗺️ Roadmap

NewName is actively developed with an ambitious roadmap. Here's what's planned:

### 📁 Advanced File Management

- **Bulk Folder Organization**: Select any folder and let NewName analyze and rename all existing files
- **Auto-Folder Assignment**: Automatically create and organize files into subfolders based on content, type, and date
- **Smart Folder Structures**: AI-suggested folder hierarchies for better organization
- **Batch Operations**: Process multiple files with preview and rollback support
- **Cleanup Mode**: Find and rename poorly-named files across your entire Downloads folder

### 🤖 Enhanced AI Capabilities

- **Expanded File Type Support**:
  - Audio files (extract artist, album, title)
  - Archive files (analyze contents for context)
  - Code files (detect language, extract purpose)
  - Spreadsheets and presentations
- **Multi-File Context Analysis**: Understand relationships between files in a series or collection
  - Smart numbering for sequential downloads
  - Detect and maintain naming patterns
  - Group related files automatically
- **Learning from Preferences**: Adapt to your naming conventions over time
- **Custom AI Prompts**: Define your own templates and instructions for AI-generated names
- **Confidence Scoring**: Show AI confidence levels and allow manual refinement

### 🎛️ Granular Control

- **Advanced Template System**:
  - Drag-and-drop template builder
  - Visual preview of filename structure
  - Conditional logic (if PDF, then include author; if image, then include resolution)
- **Fine-Grained Metadata Placement**:
  - Choose exactly where dates, sizes, resolutions appear
  - Custom date formats (YYYY-MM-DD, MM-DD-YYYY, etc.)
  - Toggle individual metadata components
- **Per-Folder/Per-Project Rules**:
  - Different naming strategies for different folders
  - Project-specific templates
  - Domain-based rules (e.g., rename GitHub downloads differently)
- **Custom Separators**: Choose between hyphens, underscores, spaces, or custom separators

### 🌐 Integration & Sync

- **Cloud Storage Integration**:
  - Direct integration with Google Drive, Dropbox, OneDrive
  - Rename files in cloud storage
  - Sync naming rules across devices
- **Settings Sync**: Cloud backup of preferences and rules
- **Export/Import Configuration**: Share configurations with teams or across devices
- **Team/Enterprise Presets**: Organization-wide naming standards
- **API Access**: Integrate NewName with other tools and workflows

### 🎨 User Experience Enhancements

- **Firefox Support**: Extend to Firefox with WebExtensions API
- **Keyboard Shortcuts**: Power-user shortcuts for common actions
- **Accessibility Improvements**:
  - Screen reader support
  - High contrast themes
  - Keyboard navigation
- **Localization (i18n)**: Multi-language support for global users

---

## 🛠️ For Developers

### Tech Stack

Built with modern web technologies and cutting-edge APIs:

- **Framework**: [WXT](https://wxt.dev/) - Modern WebExtension framework
- **UI**: React 19 + Tailwind CSS v4 + HeroUI components
- **AI Integration**:
  - Chrome Built-in AI (Prompt API, Summarizer API, Language Detector)
  - Google Gemini (via ai-sdk)
  - Custom pipeline orchestration
- **WASM Libraries**:
  - MediaInfo.js for media analysis
  - MuPDF for PDF rendering
- **Storage**: IndexedDB (via idb-keyval) + WXT Storage
- **Messaging**: @webext-core/messaging for type-safe IPC
- **Build**: TypeScript (strict), Biome (lint/format), Vitest + Playwright (testing)

### Development Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Start dev server**:
   ```bash
   bun run dev
   ```

3. **Run tests**:
   ```bash
   bun run test          # Unit tests
   bun run e2e           # E2E tests
   bun run test:manual   # Manual testing server
   ```

4. **Build for production**:
   ```bash
   bun run build         # Build extension
   bun run zip           # Package for distribution
   ```

5. **Code quality**:
   ```bash
   bun run fix           # Auto-fix lint/format
   bun run verify        # Full verification (lint + typecheck + test + build)
   ```

### Architecture Overview

NewName follows Domain-Driven Design principles with a clear separation of concerns:

- `entrypoints/background.ts` - Service worker, download coordination, rename orchestration
- `entrypoints/offscreen/` - Isolated contexts for AI processing and WASM execution
- `entrypoints/shared/` - Domain logic organized by capability:
  - `integrations/ai-provider/` - AI router, local/cloud adapters
  - `integrations/chrome-ai/` - Chrome AI model management, diagnostics
  - `integrations/mediainfo/` - MediaInfo.js coordination
  - `pipeline/` - Instant Baseline deterministic strategies
  - `filesystem/` - File System Access API operations
  - `history/` - Rename tracking and undo
  - `settings/` - Configuration persistence

For detailed architecture and contribution guidelines, see [`CLAUDE.md`](./CLAUDE.md).

### Chrome AI Setup for Development

When using `bun run dev`, WXT creates a **separate Chrome profile** that requires its own AI configuration. See [Chrome AI Development Setup](#optional-enable-local-ai-models) above, but apply flags in the WXT dev Chrome window.

For detailed troubleshooting, see [`docs/wxt-chrome-ai-setup.md`](./docs/wxt-chrome-ai-setup.md).

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

NewName is built on the shoulders of giants:

- [WXT](https://wxt.dev/) - Modern WebExtension framework
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in) - Local AI capabilities
- [Google AI SDK](https://ai.google.dev/) - Cloud AI integration
- [MediaInfo.js](https://mediainfo.js.org/) - Media metadata extraction
- [MuPDF](https://mupdf.com/) - PDF rendering and analysis
- [HeroUI](https://www.heroui.com/) - Beautiful React components

---

## 🏆 Hackathon Submission

This project is submitted to the **[Google Hackathon Name]** in the **[Category]** category.

**Key Innovation**: Local-first AI processing with seamless cloud fallback, enabling privacy-preserving intelligent file renaming at scale.

**Impact**: Saves users hours of manual file organization and makes finding files effortless.

**Demo**: [Link to demo video/site]

---

**Made with ❤️ for better file organization**
