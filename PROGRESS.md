# Progress

Single source of truth for status. The lead updates it after every step. Read it first.

## Phases

| Phase | Status | Commit | Agents used |
|---|---|---|---|
| 0 Recon and setup | done | see git log | 1 (implementer: route manifest script, + 1 follow-up message) |
| 1 Architecture | todo | – | 0 |
| 2 Foundation | todo | – | 0 |
| 3 Feature loop | todo | – | – |
| 4 Final verification | todo | – | 0 |

## Features (Phase 3)

Filled in Phase 1 from `docs/route-manifest.json`. Every admin endpoint belongs to exactly one feature.

## Blockers

- none

## Tech debt

- none

## Notes

- Custom agents in `.claude/agents/` load only after a session restart. Until then the lead uses stand-ins with the same instructions pasted into each brief: implementer = `general-purpose` on Sonnet; reader = `Explore` on Haiku (no Agent/Edit/Write tools); reviewer = `Plan` on Opus (no Agent/Edit/Write tools). The `general-purpose` stand-in relies on its brief for "never spawn agents".
- Serena is exposed as one REPL tool (`mcp__serena__serena_repl`), not as separate `find_symbol`-style tools; the agent definitions list that tool instead.
