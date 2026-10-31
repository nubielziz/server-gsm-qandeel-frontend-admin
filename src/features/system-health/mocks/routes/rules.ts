// Mock routes of the alert rules: `CRUD /admin/alert-rules`. Create and edit answer 422 with a message per field, mute
// is `mutedUntil` and switching off is `isActive`; `open` says whether an alert of the rule is open now.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import type { ProblemError } from '@/mocks/problem';
import type { AlertChannel, AlertComparator, AlertRule, AlertSeverity } from '../../types';
import { iso } from '../clock';
import { futureDate, listAnswer, numberOf, route } from '../http';
import { METRIC_UNITS } from '../specs';
import type { HealthState } from '../state';

const COMPARATORS: AlertComparator[] = ['gt', 'gte', 'lt', 'lte'];
const SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];
const CHANNELS: AlertChannel[] = ['telegram', 'email'];
const KEY = /^[a-z][a-z0-9_]{2,40}$/;

/** The rule with `open` worked out from the alerts. */
const withOpen = (state: HealthState, rule: AlertRule): AlertRule => ({
  ...rule,
  open: state.alerts.list().some((alert) => alert.ruleId === rule.id && alert.status !== 'resolved'),
});

// What the real server would refuse: a message per field, for the fields the body has (all of them when creating).
function problemsOf(
  state: HealthState,
  body: Record<string, unknown>,
  ownId: number | null,
  creating: boolean,
  now: number,
): ProblemError[] {
  const errors: ProblemError[] = [];
  const has = (field: string): boolean => creating || field in body;
  if (has('key')) {
    const key = textOf(body.key);
    if (!KEY.test(key)) {
      errors.push({
        field: 'key',
        message: 'Use 3 to 41 lowercase letters, digits or underscores, starting with a letter.',
      });
    } else if (state.rules.list().some((rule) => rule.id !== ownId && rule.key === key)) {
      errors.push({ field: 'key', message: 'A rule with this key already exists.' });
    }
  }
  if (has('name') && (textOf(body.name).length < 3 || textOf(body.name).length > 80)) {
    errors.push({ field: 'name', message: 'Enter a name of 3 to 80 characters.' });
  }
  if (has('metric') && !Object.hasOwn(METRIC_UNITS, textOf(body.metric))) {
    errors.push({ field: 'metric', message: 'Unknown metric. Choose one from the list.' });
  }
  if (has('comparator') && !COMPARATORS.some((candidate) => candidate === body.comparator)) {
    errors.push({ field: 'comparator', message: 'Choose how the value is compared with the threshold.' });
  }
  if (has('threshold') && numberOf(body.threshold) === undefined) {
    errors.push({ field: 'threshold', message: 'Enter a number.' });
  }
  const window = numberOf(body.windowSeconds);
  if (
    has('windowSeconds') &&
    (window === undefined || !Number.isInteger(window) || window < 60 || window > 86_400)
  ) {
    errors.push({ field: 'windowSeconds', message: 'Enter a whole number of seconds from 60 to 86400.' });
  }
  if (has('severity') && !SEVERITIES.some((candidate) => candidate === body.severity)) {
    errors.push({ field: 'severity', message: 'Choose info, warning or critical.' });
  }
  const channels = body.channels;
  if (
    has('channels') &&
    (!Array.isArray(channels) ||
      channels.length === 0 ||
      channels.some((c) => !CHANNELS.some((known) => known === c)))
  ) {
    errors.push({ field: 'channels', message: 'Choose at least one channel: Telegram or email.' });
  }
  if ('isActive' in body && typeof body.isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'Send true or false.' });
  }
  if (
    body.mutedUntil !== undefined &&
    body.mutedUntil !== null &&
    futureDate(body.mutedUntil, now) === undefined
  ) {
    errors.push({ field: 'mutedUntil', message: 'Mute until a time in the future, or send null to unmute.' });
  }
  return errors;
}

// The fields of a valid body that a rule stores as they are.
function applyFields(rule: AlertRule, body: Record<string, unknown>): void {
  if (typeof body.key === 'string') rule.key = textOf(body.key);
  if (typeof body.name === 'string') rule.name = textOf(body.name);
  if (typeof body.metric === 'string') {
    rule.metric = textOf(body.metric);
    rule.unit = METRIC_UNITS[rule.metric] ?? null;
  }
  if (COMPARATORS.some((candidate) => candidate === body.comparator))
    rule.comparator = body.comparator as AlertComparator;
  if (numberOf(body.threshold) !== undefined) rule.threshold = body.threshold as number;
  if (numberOf(body.windowSeconds) !== undefined) rule.windowSeconds = body.windowSeconds as number;
  if (SEVERITIES.some((candidate) => candidate === body.severity))
    rule.severity = body.severity as AlertSeverity;
  if (Array.isArray(body.channels)) rule.channels = body.channels as AlertChannel[];
  if (typeof body.isActive === 'boolean') rule.isActive = body.isActive;
  if ('mutedUntil' in body)
    rule.mutedUntil = typeof body.mutedUntil === 'string' ? iso(Date.parse(body.mutedUntil)) : null;
}

export const ruleRoutes: HttpHandler[] = [
  http.get(
    '*/admin/alert-rules',
    route({}, ({ state, url }) =>
      listAnswer(
        state.rules.list().map((rule) => withOpen(state, rule)),
        url,
        {
          search: ['name', 'key', 'metric'],
          sort: 'name',
          order: 'asc',
        },
      ),
    ),
  ),

  http.get(
    '*/admin/alert-rules/:id',
    route({}, ({ state, params }) => {
      const rule = state.rules.find(String(params.id));
      return rule ? HttpResponse.json<AlertRule>(withOpen(state, rule)) : notFound('alert rule', params.id);
    }),
  ),

  http.post(
    '*/admin/alert-rules',
    route({ write: 'alerts:create' }, async ({ state, body, now }) => {
      const input = await body();
      const errors = problemsOf(state, input, null, true, now);
      if (errors.length > 0) return invalid(errors);
      const rule = state.rules.insert({
        key: textOf(input.key),
        name: textOf(input.name),
        metric: textOf(input.metric),
        comparator: input.comparator as AlertComparator,
        threshold: input.threshold as number,
        windowSeconds: input.windowSeconds as number,
        severity: input.severity as AlertSeverity,
        channels: input.channels as AlertChannel[],
        unit: METRIC_UNITS[textOf(input.metric)] ?? null,
        isActive: input.isActive !== false,
        mutedUntil: null,
        open: false,
        createdAt: iso(now),
        updatedAt: null,
      });
      return HttpResponse.json<AlertRule>(withOpen(state, rule), { status: 201 });
    }),
  ),

  http.patch(
    '*/admin/alert-rules/:id',
    route({ write: 'alerts:update' }, async ({ state, params, body, now }) => {
      const rule = state.rules.find(String(params.id));
      if (!rule) return notFound('alert rule', params.id);
      const input = await body();
      const errors = problemsOf(state, input, rule.id, false, now);
      if (errors.length > 0) return invalid(errors);
      applyFields(rule, input);
      rule.updatedAt = iso(now);
      return HttpResponse.json<AlertRule>(withOpen(state, rule));
    }),
  ),

  http.delete(
    '*/admin/alert-rules/:id',
    route({ write: 'alerts:delete' }, ({ state, params }) =>
      state.rules.remove(String(params.id))
        ? new HttpResponse(null, { status: 204 })
        : notFound('alert rule', params.id),
    ),
  ),
];
