// The answer of `GET /admin/system/errors`: the most frequent groups of problem codes per endpoint over the range.
// Steady groups scale with the range; trouble groups count from the moment the trouble began. Dev and tests only.
import type { ErrorGroup, ErrorsResponse, TimeRange } from '../types';
import { MINUTE, SECOND, hex, iso, unit, wobble } from './clock';
import { onsetOf } from './profile';
import { ERRORS, type ErrorSpec } from './specsApi';
import type { HealthState } from './state';

const WINDOW_MIN: Record<TimeRange, number> = { '1h': 60, '6h': 360, '24h': 1440, '7d': 10_080 };

/** Where an error group stands in a scenario: not part of it, steady, or begun at a moment. */
type Origin = { kind: 'absent' } | { kind: 'steady' } | { kind: 'trouble'; since: number };
const ABSENT: Origin = { kind: 'absent' };

function originOf(state: HealthState, spec: ErrorSpec): Origin {
  const { profile, maintenance } = state;
  const onset = onsetOf(profile, state.anchor);
  switch (spec.when) {
    case 'slow':
      return profile.slowSupplier && onset !== null ? { kind: 'trouble', since: onset } : ABSENT;
    case 'outage':
      return profile.dbDown && onset !== null ? { kind: 'trouble', since: onset } : ABSENT;
    case 'maintenance':
      return maintenance.enabled && maintenance.startedAt
        ? { kind: 'trouble', since: Date.parse(maintenance.startedAt) }
        : ABSENT;
    default:
      return { kind: 'steady' };
  }
}

type Counted = { spec: ErrorSpec; count: number; first: number; last: number };

// How many of a group fall in the range, and when the first and the latest were seen. A little jitter every ten minutes.
function countOf(state: HealthState, spec: ErrorSpec, range: TimeRange, now: number): Counted | undefined {
  const origin = originOf(state, spec);
  if (origin.kind === 'absent') return undefined;
  const windowMin = WINDOW_MIN[range];
  const jitter =
    1 + 0.05 * wobble(`errors:${range}:${spec.code}:${spec.endpoint}`, Math.floor(now / (10 * MINUTE)));

  if (origin.kind === 'trouble') {
    const minutes = Math.min(windowMin, (now - origin.since) / MINUTE);
    const count = Math.round((spec.perMin ?? 0) * minutes * jitter);
    // The latest one is seconds old.
    const ago = (3 + 15 * unit(spec.code, Math.floor(now / (15 * SECOND)))) * SECOND;
    return count > 0 ? { spec, count, first: origin.since, last: now - ago } : undefined;
  }

  const count = Math.round(((spec.per24h ?? 0) * windowMin * jitter) / 1440);
  if (count < 1) return undefined;
  const window = windowMin * MINUTE;
  // The rarer the error, the longer ago the latest one was.
  const gap = Math.min(window, window / count) * 0.8;
  return {
    spec,
    count,
    first: now - window * (0.93 + 0.06 * unit(`first:${spec.code}:${spec.endpoint}`, windowMin)),
    last: now - unit(`last:${spec.code}:${spec.endpoint}`, Math.floor(now / MINUTE)) * gap,
  };
}

/** `GET /admin/system/errors`: the ten most frequent groups of the range, most frequent first. */
export function buildErrors(
  state: HealthState,
  range: TimeRange,
  surface: string | undefined,
  now: number,
): ErrorsResponse {
  // The same code on the same endpoint is one group, even when a steady and a trouble entry both feed it.
  const merged = new Map<string, Counted>();
  for (const spec of ERRORS) {
    if (surface && spec.surface !== surface) continue;
    const counted = countOf(state, spec, range, now);
    if (!counted) continue;
    const key = `${spec.code} ${spec.method} ${spec.endpoint}`;
    const known = merged.get(key);
    merged.set(
      key,
      known
        ? {
            spec: known.spec,
            count: known.count + counted.count,
            first: Math.min(known.first, counted.first),
            last: Math.max(known.last, counted.last),
          }
        : counted,
    );
  }
  const all = [...merged.values()].sort((a, b) => b.count - a.count);
  const groups = all.slice(0, 10).map(({ spec, count, first, last }): ErrorGroup => ({
    code: spec.code,
    status: spec.status,
    method: spec.method,
    endpoint: spec.endpoint,
    surface: spec.surface,
    count,
    firstSeenAt: iso(first),
    lastSeenAt: iso(last),
    lastRequestId: `req_${hex(`${spec.code}:${spec.endpoint}:${Math.floor(last / MINUTE)}`, 12)}`,
    sentryUrl: spec.sentry
      ? `https://sentry.example.com/organizations/gsm-supply/issues/${spec.sentry}/`
      : null,
  }));
  // Groups below the top ten still count in the total.
  const listed = all.reduce((sum, group) => sum + group.count, 0);
  return { range, total: Math.round(listed * 1.1), groups };
}
