# 007 Error handling (problem+json)

**Context.** REST errors are `application/problem+json` with `type, title, status, code, detail, errors[]`. Codes that matter to the console: `VALIDATION_FAILED` 422, `WEAK_PASSWORD` 422, `EMAIL_TAKEN` 409, `TOKEN_INVALID` 410, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `ACCOUNT_SUSPENDED` 403, `IP_NOT_ALLOWED` 403, `NOT_FOUND` 404, `RATE_LIMITED` 429 (+ `Retry-After`), plus business 409s. The map does not fix the shape of `errors[]` items. `DESIGN.md` wants error states that show what failed, a request ID and Retry.

**Decision.**
- `lib/api/errors.ts`: `ApiError extends Error` with `status`, `code`, `title`, `detail`, `type`, `fieldErrors: Record<string,string[]>`, `errors` (same data, in Refine `HttpError` form so `useForm` maps it onto fields), `statusCode` (alias for Refine), `requestId` (`X-Request-Id`), `retryAfter`. Non-JSON or network failures become `ApiError` with `code: "NETWORK_ERROR"` / `"HTTP_<status>"`.
- `errors[]` parsing is tolerant: field from `field` | `path` | `pointer` (`/email`, `#/email`, `body.email`) | `name`; message from `message` | `detail` | `title` | `code`.
- `applyServerErrors(error, setError)` for react-hook-form dialogs; unmatched messages go to the dialog's error slot; focus moves to the first invalid field (demo behaviour).
- Code-specific UX: see ARCHITECTURE §4 (sign-out cases, FORBIDDEN in place, 429 toast).
- Components never parse responses; they receive `ApiError` from hooks and render `ErrorState` / dialog errors.

**Consequences.** One error type everywhere; Refine forms get field errors for free; unknown server shapes degrade to a readable message instead of a crash.
