# Conventions
- One exported function per endpoint in `src/features/<f>/api/*.ts`; JSDoc = what + why + `@route METHOD /path` with the exact manifest path (`:id` kept). Only `src/lib/api/client.ts` calls `fetch`.
- CRUD functions are also registered by resource name in `features/<f>/api/resources.ts`; the data provider dispatches to them.
- Non-CRUD calls go through `useApiQuery` / `useApiMutation` (src/lib/query) with declared invalidations and toasts.
- DTOs in `features/<f>/types` derive from generated rows in `src/lib/api/schema.gen.ts` (Pick/Omit + narrowed enums). Money = 4-decimal string, dates = ISO string, ids = number.
- Cross-feature imports only via `@/features/<f>` (index.ts). `components/ui` and `lib` never import features.
- Permissions: explicit strings from the manifest (`staff:suspend`); `x:*` CRUD rows mean `x:read|create|update|delete`.
- File header comment (what + which demo page/route group); what+why block comments on non-trivial symbols; English only.
