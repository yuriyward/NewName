---
description: Review all commits and changes in the current branch against DDD principles, CLAUDE.md rules, and maintainability best practices
---

You are conducting a comprehensive code review of all commits in the current branch for this WXT browser extension project. Analyze all changes introduced by this branch against the project's architectural and quality standards.

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

## Commit History Analysis
- **Commit Messages**: Clear, descriptive messages following conventional commits
- **Logical Grouping**: Related changes grouped in appropriate commits
- **Incremental Progress**: Commits show logical progression of feature development

**Instructions:**
1. Get current branch name: `!git branch --show-current`
2. Get commit history for this branch: `!git log main..HEAD --oneline`
3. Get all changed files in this branch: `!git diff main...HEAD --name-only`
4. Get detailed diff for all changes: `!git diff main...HEAD`
5. For each changed file, read the current content to understand the final state
6. Analyze both the changes (diff) and the final file states

**Analysis Approach:**
- Review the overall branch changes as a cohesive feature/improvement
- Examine individual commits for logical organization
- Assess cumulative impact on codebase architecture
- Check for consistency across all modified files

**Output Format:**

## Branch Overview
- Branch name and commit count
- High-level summary of changes
- Overall architectural impact assessment

## Commit Analysis
For each commit:
- Commit hash and message
- Files changed and purpose
- Architectural compliance notes

## File-by-File Review
For each modified file:
- File path and change summary
- Priority-categorized issues:
  - **P0 (Blockers)**: Critical issues that violate core principles
  - **P1 (Important)**: Significant improvements needed
  - **P2 (Nits)**: Minor suggestions and optimizations
- Specific line references with recommendations
- Code snippets for complex suggestions

## Branch-Level Recommendations
- Overall architectural assessment
- Cross-file consistency issues
- Integration and testing suggestions
- Next steps for improvement

Focus on how the branch changes work together as a cohesive improvement while maintaining architectural integrity.