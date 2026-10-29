# Core
- Refine admin console that ports the static demo to a real `/admin` API client. Rules: `CLAUDE.md`. Status (only source): `PROGRESS.md`. Design: `docs/ARCHITECTURE.md`, `docs/decisions/NNN-*.md`. Demo vs map disagreements: `docs/MISMATCHES.md`.
- Inputs: `reference/gsm-admin/src/js/*.js` (demo; files concatenated alphabetically into one IIFE: `00-util` format+icons, `09/10` seed data, `11/12/14` state+mutations, `13/20` UI helpers, `30-charts`, `40-56` one page each, `90-app` shell/router/palette). `reference/gsm-map/data/{routes,schema,system}.mjs` (API map, Arabic text). Never open `reference/**/dist/**`.
- Endpoints: query `docs/route-manifest.json` (English `description`, `origin` = CRUD row) instead of routes.mjs. Owner feature per row: `docs/feature-plan.json`.
- Stack/versions: `mem:tech_stack`. Commands: `mem:suggested_commands`. Code conventions (API functions, feature boundaries, types): `mem:conventions`. Definition of done: `mem:task_completion`.
