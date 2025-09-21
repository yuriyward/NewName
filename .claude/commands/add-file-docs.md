---
description: Add concise TypeDoc comments to TypeScript/React files for better generated documentation
argument-hint: [optional: specific file path or directory to document]
allowed-tools: Read, Glob, Grep, Edit, MultiEdit, Bash(bun run docs)
---

Add concise TypeDoc file-level comments to TypeScript/React files to improve the generated documentation from `generate-structure-docs.js`.

**Target**: $ARGUMENTS (or all files if not specified)

## Comment Format

### For Classes/Main Exports:
```typescript
/**
 * Brief description of main functionality (3-8 words)
 */
export class MyClass {
```

### For Utility/Helper Files:
```typescript
/**
 * Brief description of utilities provided (3-8 words)
 */
export const myUtility = ...
```

### For React Components:
```tsx
/**
 * Brief description of UI component purpose (3-8 words)
 */
export default function MyComponent() {
```

### For Type Definition Files:
```typescript
/**
 * Brief description of types/interfaces defined (3-8 words)
 */
export interface MyType {
```

## Strategy

1. **Analyze file content** to understand main purpose
2. **Add ONE concise TypeDoc comment** at the top describing the file's role
3. **Focus on the "what"** not the "how"
4. **Keep it short** - 3-8 words describing the primary function
5. **Use consistent language** across similar file types
6. **Use TypeDoc syntax** with proper `/**` block format

## Examples of Good Comments

- `/** Calendar date manipulation and parsing utilities */`
- `/** User authentication and session management */`
- `/** Network request monitoring and caching */`
- `/** Automation command execution engine */`
- `/** React components for settings UI */`
- `/** Type definitions for message passing */`

## Process

1. Read and analyze file exports/content
2. Determine primary purpose in 3-8 words
3. Add TypeDoc comment before first export or at file top
4. Avoid generic terms like "utilities" or "helpers" when possible
5. Focus on domain-specific functionality
6. Use TypeDoc-compatible syntax for TypeScript projects

The TypeDoc comments added will be automatically picked up by `bun run docs` to generate better file descriptions in the structure documentation.

**Goal**: Every file should have ONE clear, concise TypeDoc comment that immediately tells developers what the file is for.