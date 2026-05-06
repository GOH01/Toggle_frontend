# Frontend AGENT Guide

## Module Context

This app owns the browser UX for discovery, map/list views, login/signup, favorites, owner/admin screens, and store/public detail pages.

Primary directories:

- `src/pages` for route-level screens
- `src/components` for reusable UI
- `src/hooks` for browser-side orchestration
- `src/lib` for API/session/data helpers
- `src/styles` for shared global styling

## Tech Stack & Constraints

- Use `React 19` with the existing JSX codebase.
- Use `Vite` commands from this directory only.
- Styling is based on `CSS Modules` plus `src/styles/index.css`. Do not introduce a second styling system without an explicit migration.
- Routing uses `react-router-dom`.
- Kakao map/place integration exists; preserve external place identifiers and store lookup linkage when touching map-related flows.

## Implementation Patterns

- Put route composition and page orchestration in `src/pages`.
- Put reusable visual building blocks in `src/components/common` or feature folders like `src/components/home`.
- Put API calls, session access, request/response transformation, and persistence helpers in `src/lib`.
- Put custom async composition in `src/hooks` when multiple lib functions or browser APIs are involved.
- Keep new files aligned with current naming: `PageName.jsx` with `PageName.module.css`, helper modules in camelCase.
- Prefer extending existing page variants such as `Home` and `HomeWeb` rather than duplicating flows with new parallel pages.

## Testing Strategy

- Minimum validation for frontend-only changes:
  - `cd apps/frontend && npm run build`
  - `cd apps/frontend && npm run lint`
- For API contract changes, validate the affected screens against a running backend, not just static build success.
- When editing auth, favorites, map lookup, owner, or admin flows, verify the full user path that consumes the changed helper.

## Local Golden Rules

### Do

- Use `src/lib/api.js` or adjacent lib helpers for network access.
- Keep UI state close to the page/component that owns it unless there is a clear reuse case.
- Reuse existing common inputs, buttons, badges, and cards before creating new primitives.
- Preserve Korean user-facing copy style unless the task explicitly changes content tone.

### Don't

- Do not scatter raw `fetch` calls through pages and components when `src/lib` should own the contract.
- Do not mix unrelated page concerns into shared components.
- Do not store auth state in multiple formats or multiple storage keys without a migration plan.
- Do not add heavyweight state libraries for local page coordination.

## Context Map

- **[Frontend API/session contract layer](./src/lib/AGENTS.md)** — backend calls, auth token storage, response normalization, domain mappers.
