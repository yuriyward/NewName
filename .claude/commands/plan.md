---
description: Create actionable, step-by-step coding plan from PRD for LLM-assisted implementation
---

Create an actionable, step-by-step coding plan from the provided PRD for LLM-assisted coding implementation. Consider different planning styles that suit the project's complexity and goals before selecting the most effective one. Your reasoning should support the selection of the plan style. The plan should be well-structured, concise, and actionable, providing adequate information to guide the LLM for efficient coding implementation.

**Context: WXT Browser Extension Project**
This plan is for a browser extension built with:
- **WXT Framework** with React 19 and TypeScript
- **Architecture**: Domain-driven design with clear separation
- **Tech Stack**: Tailwind v4 + DaisyUI, @webext-core/storage, Biome formatting
- **File Structure**: Domain-based organization (automation/, network/, messaging/, user/, etc.)
- **Quality Standards**: Max 300 lines per file, strict TypeScript, comprehensive testing

## Planning Process

### 1. Understand the PRD
- Carefully review the PRD to grasp project requirements, goals, and constraints
- Identify functional and non-functional requirements
- Extract user stories and acceptance criteria
- Note technical constraints and dependencies

### 2. Evaluate Planning Styles
Consider different planning approaches:
- **Waterfall**: Sequential phases, good for well-defined requirements
- **Agile/Iterative**: Flexible sprints, good for evolving requirements
- **Hybrid**: Combines structured planning with iterative delivery
- **Vertical Slice**: Feature-complete slices through all layers
- **Domain-First**: Organize by business domains, aligns with DDD architecture

### 3. Select Plan Style
Choose the most appropriate planning style with reasoned arguments based on:
- Project scope and complexity
- Duration and timeline constraints
- Flexibility and change requirements
- Team structure and collaboration needs
- Technical architecture alignment

### 4. Create Step-by-Step Plan

## Output Format

Structure the plan as follows:

### Planning Style Selection
- **Chosen Style**: [Selected approach]
- **Rationale**: Detailed reasoning for selection based on project characteristics
- **Benefits**: How this style serves the project goals
- **Adaptations**: Any modifications for browser extension context

### Implementation Plan

#### Phase 1: Analysis & Setup
- Requirements analysis and clarification
- Domain modeling and architecture design
- Development environment setup
- Initial file structure creation

#### Phase 2: Core Implementation
- Domain-by-domain development approach
- Key components and services
- Data models and storage patterns
- API endpoints and message passing

#### Phase 3: Integration & UI
- Component integration
- User interface development
- Cross-script communication setup
- Error handling and validation

#### Phase 4: Testing & Quality
- Unit and integration testing
- Manual testing scenarios
- Code quality verification (`bun run verify`)
- Security and permissions review

#### Phase 5: Deployment & Monitoring
- Build and packaging
- Extension store preparation
- Monitoring and analytics setup
- Rollback procedures

### Timeline & Milestones
- **Phase durations** with estimated effort
- **Key milestones** and deliverables
- **Critical dependencies** and blockers
- **Review checkpoints** for each phase

### Expected Deliverables
For each phase:
- **Code artifacts**: Files, components, tests
- **Documentation**: Updates to README, technical docs
- **Quality gates**: Linting, type checking, testing results
- **Review criteria**: Acceptance criteria validation

### Risk Management
- **Technical risks**: Dependencies, compatibility, performance
- **Timeline risks**: Scope creep, complexity underestimation
- **Quality risks**: Testing gaps, security vulnerabilities
- **Mitigation strategies**: For each identified risk

### Development Guidelines
- **Domain organization**: Follow established DDD structure
- **Code standards**: TypeScript strictness, file size limits, import patterns
- **Quality workflow**: Use `bun run fix` and `bun run verify`
- **Extension patterns**: Proper manifest permissions, message passing, storage

## Implementation Notes

- Ensure the plan allows flexibility for potential adjustments during implementation
- Highlight critical paths and dependencies clearly
- Maintain clarity and conciseness to keep the plan actionable and easy to follow
- Consider incorporating collaborative tools and techniques for progress tracking
- Align with project's domain-driven architecture and quality standards
- Include browser extension specific considerations (permissions, content scripts, background processes)

**Instructions**: Provide the PRD content or description as arguments. The command will analyze the requirements and generate a comprehensive coding plan tailored to your WXT browser extension project architecture.
