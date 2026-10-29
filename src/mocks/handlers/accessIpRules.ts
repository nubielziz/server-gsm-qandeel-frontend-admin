// Mock of the IP rule routes (`/admin/ip-rules*`) and the restriction switch (`/admin/access/restriction`). The check
// route answers the way 14-state-access.js's ipVerdict did: a block wins, then the allowed list when the restriction
// is on. Everything else is a simple state change.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { ipIn, isIpError, parseIp, type CheckIpResult, type IpRule, type IpScope } from '@/features/access';
import type { Collection } from '../db';
import { ipRuleStore, type MockIpRule } from '../ipRules';
import { latency } from '../latency';
import { problem } from '../problem';
import { currentStaff, guard } from '../session';
import { settingsStore } from '../settings';
import { staffStore } from '../staff';
import { bodyOf, invalid, notFound, readHandlers, textOf } from './accessShared';
import { personRef } from './accessStaff';

const KINDS = ['allow', 'block'];
const SCOPES = ['store', 'api', 'admin', 'all'];

/** The rule as the API sends it: the creator joined as `{ id, name }`, or null for the risk engine. */
async function toIpRule(row: MockIpRule): Promise<IpRule> {
  const { createdBy, ...rest } = row;
  return { ...rest, createdBy: personRef(await staffStore(), createdBy) };
}

const isLive = (rule: MockIpRule) => !rule.expiresAt || Date.parse(rule.expiresAt) > Date.now();

/** The decision for an address and an audience: block rules first, then the allowed list when the console is restricted. */
async function decide(rules: Collection<MockIpRule>, ip: string, scope: IpScope): Promise<CheckIpResult> {
  const live = rules.list().filter(isLive);
  const block = live.find(
    (rule) => rule.kind === 'block' && (rule.scope === 'all' || rule.scope === scope) && ipIn(rule.cidr, ip),
  );
  if (block) return { decision: 'refused', rule: await toIpRule(block) };
  if (scope === 'admin' && (await settingsStore()).adminAllowlistOnly === true) {
    const allow = live.find((rule) => rule.kind === 'allow' && ipIn(rule.cidr, ip));
    return allow ? { decision: 'allowed', rule: await toIpRule(allow) } : { decision: 'refused', rule: null };
  }
  return { decision: 'allowed', rule: null };
}

export const ipRuleHandlers: HttpHandler[] = [
  // The check route has its own path, so it is registered before the `/:id` handlers of readHandlers.
  http.post('*/admin/ip-rules/check', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const body = await bodyOf(request);
    const parsed = parseIp(body.ip);
    if (isIpError(parsed)) return invalid([{ field: 'ip', message: parsed.error }]);
    const scope = SCOPES.includes(String(body.scope)) ? (body.scope as IpScope) : 'admin';
    return HttpResponse.json(await decide(await ipRuleStore(), parsed.text, scope));
  }),

  ...readHandlers({
    base: '/admin/ip-rules',
    what: 'IP rule',
    searchFields: ['cidr', 'label', 'reason'],
    source: async () => {
      const rules = (await ipRuleStore()).list();
      const names = await staffStore();
      return {
        rows: rules,
        toDto: (row): IpRule => ({ ...row, createdBy: personRef(names, row.createdBy) }),
      };
    },
  }),

  http.post('*/admin/ip-rules', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const body = await bodyOf(request);
    const kind = KINDS.includes(String(body.kind)) ? (body.kind as MockIpRule['kind']) : undefined;
    const parsed = parseIp(body.cidr);
    const errors = [
      ...(kind ? [] : [{ field: 'kind', message: 'Choose allow or block.' }]),
      ...(isIpError(parsed) ? [{ field: 'cidr', message: parsed.error }] : []),
    ];
    if (errors.length > 0 || !kind || isIpError(parsed)) return invalid(errors);
    const requested = SCOPES.includes(String(body.scope)) ? (body.scope as IpScope) : 'all';
    const row = (await ipRuleStore()).insert({
      kind,
      // Allowed addresses are always for the admin console.
      scope: kind === 'allow' ? 'admin' : requested,
      cidr: parsed.text,
      label: textOf(body.label),
      reason: textOf(body.reason),
      source: 'manual',
      expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : null,
      hitCount: 0,
      lastHitAt: null,
      createdAt: new Date().toISOString(),
      createdBy: (await currentStaff())?.id ?? null,
    });
    return HttpResponse.json(await toIpRule(row), { status: 201 });
  }),

  http.delete('*/admin/ip-rules/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const removed = (await ipRuleStore()).remove(String(params.id));
    return removed ? new HttpResponse(null, { status: 204 }) : notFound('IP rule', params.id);
  }),

  // Turning the restriction on is refused when the caller's own address is not on the allowed list.
  http.put('*/admin/access/restriction', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const enabled = (await bodyOf(request)).enabled === true;
    const settings = await settingsStore();
    if (enabled) {
      const address = (await currentStaff())?.lastLoginIp;
      const allowed = (await ipRuleStore()).list().filter((rule) => rule.kind === 'allow' && isLive(rule));
      if (address && !allowed.some((rule) => ipIn(rule.cidr, address))) {
        return problem(
          409,
          'IP_NOT_IN_ALLOWLIST',
          'You would lock yourself out',
          `Your own address (${address}) is not on the list, so turning this on would lock you out. Add it first.`,
        );
      }
    }
    settings.adminAllowlistOnly = enabled;
    return HttpResponse.json({ enabled });
  }),
];
