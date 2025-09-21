---
description: Review git staged files against DDD principles, CLAUDE.md rules, and maintainability best practices
---

You are conducting a comprehensive code review of git staged files for this WXT browser extension project. Analyze each staged file against the project's architectural and quality standards.

**Review Criteria:**

## Domain-Driven Design (DDD) Compliance
- **Domain Separation**: Code organized by business domain, not technical layers
- **Direct Imports**: No re-exports through index.ts files - imports should be direct and explicit
- **Clear Boundaries**: Each domain directory contains related functionality only
- **Single Responsibility**: One primary purpose per file
- **Proper Domain Structure**: Files placed in correct domain directories (automation/, network/, messaging/, user/, navigation/, storage/, hooks/, utils/)

## CLAUDE.md Rules Compliance
- **File Size**: Max 300 lines per file
- **Complexity**: Max 3 concerns per file
- **Import Patterns**: Use @/ absolute imports, proper import order (built-ins, external, internal @/, relative, styles)
- **TypeScript**: Strict typing, avoid `any` types
- **React 19**: Function components with explicit return types for exports
- **WXT Framework**: Proper use of defineBackground, defineContentScript macros
- **Extension Patterns**: Message passing for cross-script communication, background-only storage pattern
- **Styling**: Tailwind v4 + DaisyUI components, avoid ad-hoc CSS
- **Code Quality**: 2-space indentation, single quotes (Biome config)

## Maintainability & Best Practices
- **Security**: No exposed secrets/keys, proper DOM safety, message validation
- **Performance**: Bundle size awareness, lazy-loading, efficient content scripts
- **Error Handling**: Proper error boundaries and user feedback
- **Naming**: Clear, descriptive variable and function names
- **Dependencies**: Explicit dependency management, no hidden dependencies

**Instructions:**
1. Get the list of staged files: `!git diff --staged --name-only`
2. For each staged file, read its content and analyze it thoroughly
3. Provide structured feedback with priority levels:
   - **P0 (Blockers)**: Critical issues that violate core principles and must be fixed
   - **P1 (Important)**: Significant improvements for maintainability and consistency
   - **P2 (Nits)**: Minor suggestions and optimizations

**Output Format:**
For each file, provide:
- File path and brief summary
- Priority-categorized issues with specific line references
- Concrete recommendations with code snippets when helpful
- Overall assessment of architectural compliance

Focus on actionable feedback that helps maintain the codebase's architectural integrity and future maintainability.
