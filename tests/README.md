# NewName Test Suite

This directory contains comprehensive tests for NewName's intelligent file renaming capabilities.

## 📁 Directory Structure

```
tests/
├── e2e/                                    # End-to-end tests
│   ├── instant-context-analysis.spec.ts   # Phase 1: Context-based renaming
│   ├── contextual-renaming.spec.ts        # PRD-compliant naming patterns
│   ├── ai-content-enhancement.spec.ts     # Phase 2: AI-powered improvements
│   └── extension.fixtures.ts              # Playwright test utilities
├── shared/                                 # Shared test utilities
│   └── download-resolution.ts             # Test helpers for download resolution
└── fixtures/                              # Test data and scenarios
    ├── scenarios/                          # Organized test scenarios
    │   ├── business/                       # Business document scenarios
    │   ├── design/                         # Design tool scenarios
    │   ├── media/                          # Media content scenarios
    │   └── academic/                       # Academic content scenarios (future)
    └── files/                              # Raw test files
```

## 🧪 Test Files Overview

### `instant-context-analysis.spec.ts`
**Focus**: Phase 1 instant context analysis (PRD Technical Section 4)
- Tests basic page title and domain extraction
- Validates immediate context-based renaming
- Shows clear ideal vs actual behavior
- **Currently failing** - demonstrates what needs to be implemented

**Example expectations**:
- `invoice-2025-09-15.pdf` → `"Invoice - 2025-09-15.pdf"`
- `Screenshot 2025-09-23.png` → `"NewName E2E Test - Screenshot.png"`

### `contextual-renaming.spec.ts`
**Focus**: Comprehensive PRD-compliant naming patterns
- Multi-language support (Polish, English)
- Subject → Qualifiers structure validation
- Filename safety and character policies
- Scoring and decision logic testing

**Example expectations**:
- Polish: `"Biedronka - Faktura - 2025-09-15 - 146,20 PLN"`
- English: `"Figma - Navbar fix - dialog"`

### `ai-content-enhancement.spec.ts`
**Focus**: Phase 2 AI-powered content analysis (Future)
- Documents Phase 2 upgrade scenarios
- PDF text extraction expectations
- Multi-modal content analysis (images, videos, audio)
- Upgrade decision logic and scoring

**Example expectations**:
- Phase 1: `"Invoice - 2025-09-15"`
- Phase 2: `"Biedronka - Faktura VAT - 2025-09-15 - 146,20 PLN"`

## 📋 Test Scenarios

### Business Documents (`/scenarios/business/`)
- **Polish Invoice** (`polish-invoice.html`): Tests vendor extraction, Polish language, VAT recognition
- **Sprint Planning** (`sprint-planning.html`): Tests meeting context, company names, duration

### Design Tools (`/scenarios/design/`)
- **Figma Component** (`figma-component.html`): Tests design tool recognition, component naming

### Media Content (`/scenarios/media/`)
- **Tutorial Video** (`tutorial-video.html`): Tests video classification, tech content, Polish language
- **Landscape Photo** (`landscape-photo.html`): Tests photo metadata, location extraction, nature subjects

## 🚀 Running Tests

```bash
# Run all E2E tests
bun run e2e

# Run specific test suites
bun run e2e --grep "Phase 1"
bun run e2e --grep "Polish invoice"
bun run e2e --grep "AI Enhancement"

# Run with HTML report
bun run e2e:report
```

## 📊 Test Status & Development Progress

| Test Suite | Status | Purpose |
|------------|--------|---------|
| `instant-context-analysis.spec.ts` | 🔴 **4/4 failing** | Defines Phase 1 requirements |
| `contextual-renaming.spec.ts` | 🔴 **5/18 failing** | Validates PRD compliance |
| `ai-content-enhancement.spec.ts` | 🔴 **1/9 failing** | Documents Phase 2 vision |

**Expected behavior**: Tests will turn green as features are implemented according to PRD specifications.

## 🎯 Test Development Philosophy

### ✅ Clear Ideal Behavior
Each test clearly states:
- What **should** happen according to PRD
- What **currently** happens
- Console output showing the gap

### ✅ No Compromise Testing
Tests don't try to pass with current limitations - they define success criteria.

### ✅ Development-Driven
Failing tests provide clear implementation targets:
1. **Page context extraction** (titles, domains, metadata)
2. **Document type recognition** (invoice, screenshot, etc.)
3. **Language detection and preservation** (Polish/English)
4. **Human-readable naming patterns** (Subject → Qualifiers)

## 🔍 Test Data Coverage Matrix

| File Type | Language | Phase 1 Tests | Phase 2 Tests | Scenarios |
|-----------|----------|---------------|---------------|-----------|
| PDF Invoice | Polish | ✅ Context extraction | ✅ Content analysis | Business |
| PNG Screenshot | English | ✅ App detection | ✅ OCR analysis | Design |
| TXT Notes | English | ✅ Page context | ✅ Topic extraction | Business |
| Video Tutorial | Polish | ✅ Metadata | ✅ Keyframe analysis | Media |
| Photo JPEG | Polish | ✅ Location hints | ✅ EXIF data | Media |

## 🛠 Development Workflow

1. **Red Phase**: Tests fail, showing what needs to be implemented
2. **Green Phase**: Implement features to make specific tests pass
3. **Refactor Phase**: Improve implementation while keeping tests green
4. **Expand Phase**: Add more test scenarios for edge cases

This approach ensures that every feature developed directly supports the PRD vision and user requirements.