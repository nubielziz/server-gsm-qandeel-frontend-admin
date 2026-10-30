// Mock of the risk rules (`GET` and `PUT /admin/risk/rules`). The PUT checks what the real server checks and the screens
// show: known rules, whole-number values and a review threshold below the block threshold (422 with the message on the
// threshold's field). Mock data only (decision 014).
import { http, HttpResponse, type HttpHandler } from 'msw';
import { bodyOf, invalid } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import type { ProblemError } from '@/mocks/problem';
import { guard } from '@/mocks/session';
import { RULE_ID } from '../lib/rules';
import type { RiskRule } from '../types';
import { riskState } from './store';

type Incoming = { id?: unknown; on?: unknown; value?: unknown };

// The messages a bad set deserves, per rule id.
function problems(incoming: readonly Incoming[], known: readonly RiskRule[]): ProblemError[] {
  const errors: ProblemError[] = [];
  const valueOf = (id: string) => incoming.find((rule) => rule.id === id)?.value;
  for (const rule of incoming) {
    const current = known.find((candidate) => candidate.id === rule.id);
    const id = typeof rule.id === 'string' ? rule.id : 'rules';
    if (!current) errors.push({ field: id, message: 'Unknown rule.' });
    else if (rule.value !== null && rule.value !== undefined) {
      if (!Number.isInteger(rule.value) || (rule.value as number) < 0) {
        errors.push({ field: id, message: 'Enter a whole number.' });
      }
    }
  }
  const hold = valueOf(RULE_ID.hold);
  const block = valueOf(RULE_ID.block);
  if (typeof hold === 'number' && typeof block === 'number' && hold >= block) {
    errors.push({
      field: RULE_ID.hold,
      message: 'The review threshold must be lower than the block threshold.',
    });
  }
  return errors;
}

export const rulesHandlers: HttpHandler[] = [
  http.get('*/admin/risk/rules', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    return HttpResponse.json({ rules: (await riskState()).rules });
  }),

  http.put('*/admin/risk/rules', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await riskState();
    const body = await bodyOf(request);
    const incoming = Array.isArray(body.rules) ? (body.rules as Incoming[]) : [];
    const errors = problems(incoming, state.rules);
    if (incoming.length === 0 || errors.length > 0) {
      return invalid(errors.length > 0 ? errors : [{ field: 'rules', message: 'Send the rules.' }]);
    }
    for (const rule of incoming) {
      const current = state.rules.find((candidate) => candidate.id === rule.id);
      if (!current) continue;
      current.on = rule.on === true;
      current.value = typeof rule.value === 'number' ? rule.value : current.value;
    }
    return HttpResponse.json({ rules: state.rules });
  }),
];
