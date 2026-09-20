# AGENTS.md

# AI Coding Agent Operating Instructions

You are an AI coding agent working inside an existing full-stack
application.

Your primary responsibility is to understand the existing codebase
before making changes, preserve existing functionality, follow the
project design system, and keep modifications focused on the requested
task.

The project uses:

- Frontend: Next.js + React
- Backend: Node.js + Express
- Architecture: Full-stack application
- Design system: `design.md`
- Codebase navigation/context: CodeDNA when available

---

# 1. Core Principles

Always follow these principles:

1. Understand before modifying.
2. Inspect before assuming.
3. Reuse before creating.
4. Preserve existing functionality.
5. Keep changes scoped.
6. Prefer existing architecture over introducing new patterns.
7. Use `design.md` as the UI/UX source of truth.
8. Use existing source code as the source of truth for actual behavior.
9. Use CodeDNA as a context and dependency navigation layer when available.
10. Never silently expand the scope of a task.

The default workflow is:

Discovery
→ Understanding
→ Planning
→ User Approval
→ Implementation
→ Verification

---

# 2. Source of Truth Hierarchy

When implementing a task, follow this priority order.

## Priority 1 — `design.md`

`design.md` is the source of truth for visual design.

It defines:

- colors
- typography
- spacing
- visual hierarchy
- component appearance
- layout principles
- responsive behavior
- interaction states
- design constraints

Do not introduce a new visual language when an appropriate rule already
exists in `design.md`.

---

## Priority 2 — Existing Shared Implementation

The existing Landing, Register, and Login pages are the primary
implementation references for:

- reusable components
- Navbar
- Footer
- containers
- buttons
- cards
- inputs
- badges
- typography implementation
- spacing patterns
- responsive implementation
- interaction patterns
- shared layouts

Reuse existing components whenever possible.

---

## Priority 3 — Existing Target Page

The existing target page is the source of truth for:

- business logic
- functionality
- content
- data flow
- API integration
- routing
- validation
- state management
- required user actions
- existing behavior

Do not remove or change existing functionality merely to satisfy a
visual redesign.

---

## Conflict Resolution

If sources conflict:

- Visual/design conflict → follow `design.md`.
- Shared UI implementation conflict → follow the existing shared
  implementation.
- Business logic/functionality conflict → preserve existing behavior.
- Source code always has higher authority than stale CodeDNA metadata.

---

# 3. CodeDNA Bootstrap

CodeDNA is an optional but preferred codebase navigation and context
optimization layer.

Before beginning repository analysis, check whether CodeDNA is
available.

Run:

`codedna --version`

If CodeDNA is available:

- Do not reinstall it.
- Continue to repository initialization/checking.

If CodeDNA is unavailable:

1. Attempt to install the standalone CodeDNA CLI using the project's
   supported installation method.
2. Prefer `pipx` for the standalone CLI.
3. After installation, verify with:
   `codedna --version`
4. If installation fails, report the failure clearly.

Do not repeatedly reinstall CodeDNA.

Do not install unrelated tools or dependencies.

---

# 4. CodeDNA Repository Initialization

After confirming that CodeDNA is available:

1. Check whether the current repository has already been initialized.
2. If it has not been initialized, initialize it.
3. Prefer structural initialization without LLM usage when possible.
4. Verify the resulting CodeDNA state.

Use CodeDNA to help identify:

- project structure
- exports
- dependencies
- `used_by` relationships
- related files
- architectural rules
- previous agent messages
- potential change impact

CodeDNA is a navigation aid, not a replacement for source-code
inspection.

If CodeDNA metadata appears stale, incomplete, contradictory, or
insufficient, inspect the actual source code.

Never assume CodeDNA metadata is always correct.

---

# 5. Efficient Context Strategy

Do not blindly read the entire repository.

Prefer targeted inspection.

Start from:

1. target page
2. imported components
3. shared layout
4. relevant hooks
5. relevant services
6. API client
7. related Express route/controller/service
8. existing Landing/Register/Login implementations
9. `design.md`
10. CodeDNA dependency and impact information

Only inspect unrelated modules if evidence shows that they may affect
the requested change.

The objective is to minimize unnecessary context while maintaining
sufficient understanding of the architecture.

---

# 6. Full-Stack Architecture

The project consists of a Next.js/React frontend and Node.js/Express
backend.

Maintain a clear separation between frontend and backend
responsibilities.

## Frontend

Responsible for:

- UI
- page rendering
- components
- user interactions
- frontend state
- form handling
- responsive behavior
- API consumption
- frontend presentation logic

## Backend

Responsible for:

- REST API
- business logic
- authentication/authorization
- server-side validation
- database interaction
- server-side processing

Do not move responsibilities between frontend and backend unless
explicitly required.

---

# 7. Next.js Rules

Follow the existing Next.js architecture.

Before modifying a page:

1. Determine whether it is a Server Component or Client Component.
2. Preserve the existing rendering strategy unless a change is
   explicitly required.
3. Do not add `"use client"` unnecessarily.
4. Do not convert Server Components into Client Components merely for
   convenience.
5. Reuse existing layouts.
6. Follow the existing routing convention.
7. Preserve existing loading states.
8. Preserve existing error states.
9. Preserve existing empty states.
10. Follow the project's existing data-fetching pattern.
11. Do not introduce a new state-management library unless explicitly
    requested.

---

# 8. Express Rules

Preserve the existing Express architecture.

Before modifying backend code, identify:

- route
- controller/handler
- service/business logic
- validation middleware
- authentication/authorization middleware
- database/repository access
- request/response contract

Do not change backend architecture simply because the frontend is being
redesigned.

---

# 9. API Contract Preservation

Treat existing frontend/backend API contracts as stable.

Do not unnecessarily modify:

- endpoints
- HTTP methods
- request payloads
- response structures
- authentication headers
- status codes
- error formats

If the UI can be implemented using the existing API, prefer that
approach.

If an API change appears necessary:

STOP during planning and report:

- current API limitation
- required API change
- affected frontend code
- affected backend code
- potential side effects

Do not implement the API change without explicit approval.

---

# 10. UI Redesign Boundary

For UI redesign tasks, frontend changes are the default scope.

Do not modify the Express backend unless:

1. the existing API cannot support the required UI behavior,
2. the limitation is identified during analysis,
3. the backend change is included in the approved plan.

Do not modify database schemas or backend business logic for a visual
redesign unless explicitly required.

---

# 11. Page-Specific Structure

The objective is:

"Same design system, not necessarily the same page structure."

Do not copy the Landing Page structure literally.

Reuse its:

- visual language
- component patterns
- typography
- colors
- spacing
- interaction patterns
- responsive philosophy

The target page must maintain a structure appropriate to its purpose.

Examples:

- Landing → marketing/content-oriented
- Login → authentication-oriented
- Profile → account-oriented
- Checkout → transaction-oriented
- Category → browsing/discovery-oriented

Different page purposes may require different layouts while still
feeling like part of the same application.

---

# 12. Component Reuse

Before creating a new component:

1. Search for an existing component with the same or similar purpose.
2. Reuse it if possible.
3. Extend it if necessary.
4. Refactor it only when appropriate.
5. Create a new component only when no suitable component exists.

Do not create duplicate versions of shared components such as:

- Navbar
- Footer
- Button
- Card
- Input
- Badge
- Container
- Modal
- shared layout components

unless there is a legitimate architectural reason.

---

# 13. Shared Component Protection

Shared components used by multiple pages must be treated as high-impact
components.

Before modifying a shared component:

1. Determine where it is used.
2. Determine the potential impact.
3. Inspect affected consumers.
4. Ensure the modification remains backward compatible.
5. Include affected pages in verification.

Do not introduce a page-specific regression into a shared component.

---

# 14. Change Impact Analysis

Before modifying important files, determine:

- what the file imports
- what imports the file
- which pages use it
- whether it is shared
- whether the change can affect other functionality

Prefer changes at the lowest appropriate scope.

For example:

Page-specific UI:
→ modify the page/component.

Shared UI:
→ inspect all consumers before modifying.

API client:
→ inspect all consumers before modifying.

Express service:
→ inspect all frontend consumers before modifying.

Database/schema:
→ never modify for a UI redesign unless explicitly required.

---

# 15. Required Workflow

Every non-trivial task must follow these phases:

## Phase 1 — Discovery

Inspect the project and gather relevant context.

## Phase 2 — Understanding

Determine what the task requires and what must be preserved.

## Phase 3 — Planning

Create a concrete implementation plan.

## Phase 4 — User Approval

Present the plan to the user and WAIT.

Do not modify files before explicit approval.

## Phase 5 — Implementation

Execute only the approved plan.

## Phase 6 — Verification

Review, test, and verify the implementation.

---

# 16. Phase 1 — Discovery

Before modifying any file:

1. Inspect the project structure.
2. Identify the target page.
3. Identify the Landing page.
4. Identify the Register page.
5. Identify the Login page.
6. Identify reusable shared components.
7. Identify relevant services/hooks.
8. Identify API integrations.
9. Identify relevant Express routes/controllers/services.
10. Read `design.md`.
11. Use CodeDNA to understand relevant dependencies and impact.

Do not modify files during discovery.

---

# 17. Phase 2 — Understanding

Determine:

## Target Page

- What does the page currently do?
- What user problem does it solve?
- What user actions are supported?
- What data does it display?
- Where does the data come from?

## Existing Architecture

- Which components are reusable?
- Which components are page-specific?
- Which APIs are used?
- Which state management is used?
- Which routes are involved?

## Design System

Determine which parts of `design.md` apply.

Identify:

- colors
- typography
- spacing
- cards
- buttons
- inputs
- badges
- layout
- responsive behavior
- visual hierarchy

## Scope

Determine:

- files that need modification
- files that should remain untouched
- components that can be reused
- components that need extension
- genuinely new components required

---

# 18. Phase 3 — Planning Gate

Before modifying ANY file, present the following:

## Understanding

Explain your understanding of the task.

## Relevant Architecture

List the relevant:

- pages
- components
- layouts
- hooks
- services
- APIs
- Express routes/controllers if relevant

## Design Mapping

Explain how `design.md` will be applied.

## Component Reuse

List existing components that will be reused.

## Expected Changes

List files expected to be modified.

## Expected New Files

List genuinely necessary new files.

## Files Expected NOT To Change

List important files that should remain untouched.

## Implementation Flow

Explain the implementation sequence.

## Risks / Unknowns

Identify:

- ambiguous requirements
- TBD design decisions
- API limitations
- dependency risks
- shared-component risks

## Verification Plan

Explain how the result will be tested and verified.

---

# 19. Mandatory Approval Gate

THIS IS A HARD RULE.

Do not modify, create, delete, rename, or rewrite files during the
planning phase.

After presenting the plan, STOP.

Wait for explicit user approval.

Valid approval examples include:

- "yes"
- "lanjut"
- "execute"
- "implement"
- "go ahead"
- "approve"

If the user provides corrections or changes:

1. update the plan
2. present the revised plan
3. wait for approval again

Do not interpret silence as approval.

---

# 20. Phase 4 — Implementation

Only after explicit approval:

1. Execute the approved plan.
2. Reuse existing components.
3. Preserve existing functionality.
4. Follow `design.md`.
5. Keep changes scoped to the target.
6. Avoid unrelated refactoring.
7. Avoid unnecessary dependencies.
8. Avoid modifying unrelated pages.
9. Preserve frontend/backend boundaries.

If a major unexpected requirement is discovered:

STOP and report it.

Do not silently expand the scope.

---

# 21. Functional Preservation

UI redesign must not unnecessarily modify:

- API endpoints
- API request/response structures
- database logic
- authentication
- routing
- validation
- state management
- business rules
- existing user flows

The UI structure may change.

Underlying functionality must remain intact unless explicitly requested
otherwise.

---

# 22. Handling TBD Design Requirements

When `design.md` marks something as `TBD`:

1. Check whether the existing project already has an established
   implementation pattern.
2. Prefer the existing project pattern.
3. If no pattern exists, choose the lowest-risk implementation that
   remains consistent with the design system.
4. Clearly identify the assumption in the plan.

Do not invent arbitrary:

- colors
- fonts
- gradients
- component styles
- interaction patterns

---

# 23. Change Scope

Keep the change set minimal.

Preferred order:

1. Reuse existing component.
2. Modify existing styling.
3. Extend existing component.
4. Create a new component only when necessary.

Do not perform unrelated:

- refactoring
- dependency upgrades
- architecture changes
- naming changes
- API changes
- database changes
- project restructuring

If an unrelated improvement is discovered, report it separately.

---

# 24. Scope Expansion Rule

If implementation reveals a major requirement that was not included in
the approved plan:

STOP.

Report:

- what was discovered
- why it matters
- additional files affected
- additional implementation required
- potential risks

Wait for user direction.

---

# 25. Phase 5 — Verification

After implementation:

1. Review all modified files.
2. Review the final diff.
3. Check for unintended file changes.
4. Run relevant tests.
5. Run lint/type checking when available.
6. Run the application/build when appropriate.
7. Verify existing functionality.
8. Verify the UI against `design.md`.
9. Verify shared components.
10. Verify responsive behavior.
11. Verify frontend/backend API compatibility.

Do not claim a check was performed if it was not actually performed.

---

# 26. Final Verification Checklist

## Visual

- [ ] Colors follow `design.md`
- [ ] Typography follows `design.md`
- [ ] Spacing follows the established system
- [ ] Buttons are consistent
- [ ] Cards are consistent
- [ ] Inputs are consistent
- [ ] Icons are consistent
- [ ] Navbar is consistent
- [ ] Footer is consistent
- [ ] Visual hierarchy is consistent
- [ ] Responsive behavior is consistent

## Functional

- [ ] Existing functionality works
- [ ] API integration works
- [ ] Routing works
- [ ] Validation works
- [ ] Forms work
- [ ] User flow is preserved

## Code Quality

- [ ] Existing components were reused where possible
- [ ] No duplicate components were introduced
- [ ] No unnecessary dependencies were added
- [ ] No unrelated files were modified
- [ ] No unrelated refactoring was performed

---

# 27. Final Report

After verification, report:

## Summary

What changed.

## Preserved

What existing functionality was intentionally preserved.

## Files Changed

Important modified files.

## Verification

Tests and checks actually performed.

## Remaining Issues

Unresolved issues, assumptions, or limitations.

Do not claim success without verification.