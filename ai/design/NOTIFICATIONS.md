# Notifications Design Book

A comprehensive, interactive guide to all notification patterns in the NewName extension.

## What's Included

### ✨ Live Examples (Compact, Tight Layout)

The **Notifications** section in the design book showcases:

#### 1. **Upgrade Notification (Confirm Pattern)** (4 States)
- `pending` - Auto-rename countdown running, hover to pause & edit
- `applied` - Rename was applied successfully
- `kept` - User kept original name
- `error` - Operation failed

**Implementation**: `entrypoints/shared/ui/ConfirmToast.tsx`
**Actions**: Rename, Keep Original (no "Always apply")
**Features**: Auto-rename countdown (5s), hover pauses countdown, inline textarea edit on hover
**Interaction Model**:
- Default state: Shows filename with countdown badge, will auto-rename when countdown expires
- Hover state: Pauses countdown, reveals Rename/Keep Original buttons and editable textarea
- Resume: When hover ends without action, countdown resumes
- Edit: Filename becomes editable textarea on hover (no separate button)

#### 2. **Upgrade Notification** (Confidence Levels - PRD Section 5.2)
- Confidence levels: High, Suggested, Alternative
- Reason tags: Title, Date, Geo, Source, Language
- Before/After filename preview
- Details drawer with mini preview

**Status**: Visual examples & spec reference
**Actions**: Apply, Details, Not now, Always apply for type
**Badges**: On-device vs Cloud assist

#### 3. **Confirm Modal** (PRD Section 5.3)
- Normal variant (standard flow)
- Sensitive document variant (auto-flagged legal/financial)
- Editable proposed name field (30-60 char helper text)
- Language selector with detection override
- Alternative suggestions (1-2 more)

**Status**: Design spec with interactive preview
**Actions**: Rename, Keep original, Show alternatives

#### 4. **Onboarding Screens** (PRD Section 3)
- Screen 1: Mode selection (Balanced, Silent, Careful, Custom)
- Screen 2: Cloud assist toggle + per-type checkboxes
- Screen 3: Downloads folder permission grant
- Screen 4: Enable on-device AI models

**Status**: Thumbnail grid preview showing all 4 screens

#### 5. **Error & Processing States**
- Model unavailable
- Permission missing
- Processing states (analyzing, reading, detecting)

**Copy Examples**:
- Success: "✨ Found better name: **Database — CORS**"
- Processing: "🧠 Analyzing first pages…"
- Error: "On-device model not ready — using Metadata-only mode"

---

## Design Principles (Maintained)

✓ **Compact, Tight Layout**: 8px grid spacing, no excessive padding
✓ **Small Text**: 10-12px base, 14px headings max
✓ **Dense Cards**: Minimal padding, focused content
✓ **Small Buttons**: `heroui-button-sm` throughout
✓ **Efficient Layout**: 2-column grid, scaled previews

---

## Interactive Features

- **State Toggles**: Click buttons to cycle through notification states
- **Copy Guidelines**: PRD copy examples with copy-to-clipboard
- **File References**: Links to implementation files with line numbers
- **Timing Visualization**: Countdown and progress animations
- **Theme Support**: Light/Dark mode toggle verifies all states
- **Accessibility Notes**: Keyboard shortcuts, ARIA labels displayed

---

## How to Use

1. Open the design book at `ai/design/index.html`
2. Click **"Notifications"** in the left navigation
3. Explore each notification type
4. Use state toggles to see all variations
5. Copy code examples for implementation reference
6. Check "Implementation" links for file paths

---

## File Structure

```
ai/design/
├── src/
│   ├── App.tsx                      # Main design book with NotificationsSection
│   ├── notification-examples.tsx    # Mock components & utilities
│   ├── styles.css                   # Toast & modal styles
│   └── main.tsx                     # Entry point
├── NOTIFICATIONS.md                 # This file
├── README.md                        # Design system overview
└── index.html                       # Build output
```

---

## Component Imports (from App.tsx)

```tsx
import {
  ConfirmToastPreview,
  RenameToastPreview,
  UpgradeNotificationPreview,
  ConfirmModalPreview,
  OnboardingScreenPreview,
  StatePreview,
  StateToggleButton,
  CompactCodeSnippet,
  ImplRef,
} from './notification-examples';
```

---

## Styling Classes (Compact Design)

- `.heroui-toast-sm` - 2px padding, 10px text, 1.5px gap
- `.heroui-card` - Minimal padding, tight borders
- `.heroui-button-sm` - Small size for actions
- `.heroui-chip-sm` - Compact confidence/status badges
- `.code-block` - Max 4 lines visible, scrollable

---

## PRD References

- **Design Perspective**: `docs/PRD-design-perspective.md`
- Section 3: Onboarding flows
- Section 5.2: Upgrade Notification specs
- Section 5.3: Confirm Modal specs
- Section 6: Micro-interactions & Copy

---

## App Implementation (Coming Next)

The design book establishes the visual patterns. The following app refactoring is planned:

### Core Files to Update

1. **`entrypoints/shared/ui/ConfirmToast.tsx`**
   - Add hover state tracking via `onPointerEnter`/`onPointerLeave`
   - Show/hide buttons based on hover state
   - Remove `onAlwaysApply` prop and handler
   - Auto-show textarea on hover (remove pencil icon edit button)
   - Keep countdown pause/resume on hover

2. **`entrypoints/shared/ui/FilenameEditor.tsx`**
   - Remove pencil icon button entirely
   - Auto-activate textarea when parent component is hovered
   - Simplify edit mode trigger logic

3. **`entrypoints/shared/toast/types.ts`**
   - Remove `'always-apply'` from `ConfirmToastAction` type
   - Remove `onAlwaysApply` from component props
   - Update `allowAlwaysApply` field if needed

4. **Background event handlers**
   - Remove `'always-apply'` action handling in message processors
   - Keep `'approve'` and `'keep-original'` actions

### Key Changes
- ✅ Design complete: Hover-based interaction model
- ⏳ Implementation pending: Refactor components to match design
- ⏳ Testing: Verify hover pause/resume countdown behavior
- ⏳ Cleanup: Remove "Always apply" decision paths

---

## Next Steps (Design Book)

- Use this book as a **reference for designers** building new notification UIs
- Share with **developers** during the app refactoring phase
- Keep updated as new notification types are added to the extension
- Test all examples in **light and dark themes** before shipping

---

**Built with**: React 19, HeroUI, Heroicons, Tailwind CSS v4
**Last updated**: Oct 22, 2024
