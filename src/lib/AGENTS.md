# Frontend Lib AGENT Guide

## Module Context

`src/lib` is the contract boundary between the React UI and backend APIs or browser session storage.

Current responsibilities visible in this folder:

- API base request handling
- Auth and session persistence
- Favorites, owner, admin, public institution, and store calls
- Store/runtime mapping helpers used by pages and hooks

## Tech Stack & Constraints

- Network access should flow through `apiRequest` in `api.js` unless a truly separate transport is required.
- `VITE_API_BASE_URL` is the backend origin source for browser requests.
- Backend responses are expected to follow a success envelope. Preserve that assumption unless both client and server are migrated together.
- Keep browser storage handling centralized in session/auth helpers.

## Implementation Patterns

- Add new endpoint modules next to related domain helpers, not inside page files.
- Normalize backend payloads here when UI-facing shapes differ from raw DTOs.
- Keep request builders and mapping helpers deterministic and side-effect light.
- Throw meaningful user-displayable errors from this layer when transport or envelope validation fails.
- If multiple pages need the same API flow, lift it into `src/lib` first and let hooks/pages compose it.

## Testing Strategy

- Validate changed modules through the consuming page flow plus `npm run build`.
- For auth/session changes, test login, refresh-sensitive screens if applicable, and logout.
- For store/favorite/owner/admin changes, verify both happy path and server error handling.

## Local Golden Rules

### Do

- Preserve one source of truth for API base URL, token retrieval, and response parsing.
- Keep request payload keys aligned with backend DTO names.
- Add small mapping helpers rather than leaking raw backend field names into many pages.

### Don't

- Do not read or write local/session storage directly from many unrelated UI files when this folder can own it.
- Do not swallow backend errors and replace them with generic messages unless required for UX.
- Do not introduce endpoint-specific fetch wrappers that duplicate `apiRequest` behavior.
