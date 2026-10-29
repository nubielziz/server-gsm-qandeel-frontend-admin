# 012 Test tooling

**Context.** No server exists yet. The riskiest code is shared plumbing (fetch client, error parsing, CSRF, query mapping, permission matching, formatters) and client guards. Visual parity with the demo is checked by eye/screenshots, not by tests.

**Decision.** Vitest 4 + jsdom + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`; MSW (`msw/node`) for API tests, reusing the dev mock handlers where useful. Foundation ships tests for `lib/api`, `lib/format`, `lib/auth`, the data provider param mapping and the auth provider. Each feature adds tests for its non-trivial pure logic (mappers, guards, builders) and at least one hook or component test for its main action. `npm test` runs once (no watch) and must be green before a commit. No browser E2E suite for now; Playwright may be used ad hoc for screenshots.

**Consequences.** Fast tests in the same toolchain as the build; API behaviour is tested against problem+json responses the way the real server will send them.
