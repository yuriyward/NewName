# NewName Design Brand Guide

An interactive design system showcase built with React and HeroUI patterns.

## Design System: What's Inside

- **Interactive Components**: Live examples of Cards, Buttons, Toasts, Modals
- **Color System**: HeroUI-based semantic colors with copy-to-clipboard
- **Typography Scale**: Font hierarchy optimized for extension UI
- **UI Patterns**: Real patterns from the extension (upgrade notifications, settings rows)
- **State Examples**: Loading, error, and success states with animations
- **Theme Toggle**: Switch between light and dark modes
- **Code Snippets**: Copy-paste ready implementation examples

## Getting Started

Open `index.html` in your browser to explore the interactive design guide.

## Project Structure

```
ai/design/
├── index.html              # Main interactive guide
├── components/             # Future: Additional React components
├── styles/                 # Future: Additional CSS/theme files
├── assets/                 # Future: Icons, images, examples
└── README.md              # This file
```

## Design Principles

Our design system follows these core principles:

### Instant Value, Zero Drag
The Instant Baseline rename never blocks the download longer than necessary.

### Upgrade, Don't Nag
Contextual Upgrade suggestions appear briefly and are easy to accept, ignore, or undo.

### Trust at a Glance
Clear "On-device" vs "Cloud assist" badges with reason tags (Title/Date/Geo).

### Respect Agency
Undo everywhere, per-type controls, explicit cloud consent.

## Brand Personality

**Invisible, competent, privacy-forward**

- Tone: Concise, friendly, non-cute
- Voice: Confident but not presumptuous
- Visual: Clean, unobtrusive, functional

## Usage Context

This design system is optimized for:
- Chrome extension popup (dense, 14-15px text)
- Settings pages (roomy, 16px text) 
- Toast notifications (temporary, non-intrusive)
- Modal confirmations (focused, accessible)

## HeroUI Integration

Built on HeroUI design tokens:
- Semantic color system with light/dark theme support
- Typography scales with consistent hierarchy
- Component patterns following accessibility best practices
- CSS variables for easy customization

## Implementation

All examples use HeroUI component patterns that can be directly implemented in your React components:

```jsx
import { Button, Card, Toast, Chip } from '@heroui/react';

// Example usage matching the design guide
<Button color="primary" size="sm">Apply Rename</Button>
<Card className="p-4">Content here</Card>
<Chip size="sm" color="secondary">On-device</Chip>
```

## Reference

- [HeroUI Documentation](https://www.heroui.com)
- [Extension PRD - Design Perspective](../docs/PRD-design-perspective.md)
- [Extension PRD - Technical Perspective](../docs/PRD-technical-perspective.md)