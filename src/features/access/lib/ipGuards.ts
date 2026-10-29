// Client hints for IP rules, ported from addIpRule, removeIpRule and setAccessRestrict of 14-state-access.js.
// They catch the obvious mistakes (wrong shape, a range that is too wide, locking yourself out) before a request is
// sent. The server still enforces its own rules and its answer is always shown.
//
// "Your address" is `me.lastLoginIp` (assumption: the map has no endpoint that tells the console which address
// the current request comes from, and the last sign-in is the best proxy).
import { num } from '@/lib/format';
import type { IpRule, IpRuleKind, IpScope } from '../types';
import { ipIn, isIpError, parseIp } from './ip';
import { isLive } from './ipRules';

/** A hint is either fine or a sentence saying why not. */
export type Guard = { ok: true } | { ok: false; reason: string };

const OK: Guard = { ok: true };
const refuse = (reason: string): Guard => ({ ok: false, reason });

/** The widest IPv4 range the console lets through: a /16 (65,536 addresses). */
export const NARROWEST_PREFIX = 16;

/**
 * Reads the address field of the allow and block dialogs. Gives the normalised range to send, or the sentence for
 * the field: a shape error, a range wider than /16, or (for a block that reaches the console) a range that
 * includes the caller's own address.
 */
export function readIpRuleInput(input: {
  raw: string;
  kind: IpRuleKind;
  scope: IpScope;
  myIp?: string | null;
}): { cidr: string } | { error: string } {
  const parsed = parseIp(input.raw);
  if (isIpError(parsed)) return { error: parsed.error };
  if (parsed.v === 4 && parsed.bits < NARROWEST_PREFIX) {
    return {
      error: `That range is too wide (${num(2 ** (32 - parsed.bits))} addresses). Use /${NARROWEST_PREFIX} or narrower.`,
    };
  }
  const reachesConsole = input.scope === 'admin' || input.scope === 'all';
  if (input.kind === 'block' && reachesConsole && input.myIp && ipIn(parsed.text, input.myIp)) {
    return {
      error: `This includes your own address (${input.myIp}). You would lock yourself out of the console.`,
    };
  }
  return { cidr: parsed.text };
}

/** True when a live allowed range covers the address. */
export function isAllowed(allowRules: readonly IpRule[], ip: string, now: number = Date.now()): boolean {
  return allowRules.some((rule) => rule.kind === 'allow' && isLive(rule, now) && ipIn(rule.cidr, ip));
}

/**
 * Removing the one allowed range that still covers the caller, while the restriction is on, would lock them out.
 * (The demo refused any removal when no other range covered the caller; this one also lets through a removal
 * that does not touch the caller's own range.)
 */
export function removeRuleGuard(input: {
  rule: IpRule;
  allowRules: readonly IpRule[];
  restricted: boolean;
  myIp?: string | null;
  now?: number;
}): Guard {
  const { rule, allowRules, restricted, myIp, now = Date.now() } = input;
  if (rule.kind !== 'allow' || !restricted || !myIp || !ipIn(rule.cidr, myIp)) return OK;
  const others = allowRules.filter((other) => other.id !== rule.id);
  if (isAllowed(others, myIp, now)) return OK;
  return refuse(
    'This is the rule that lets you in right now. Add another one that covers your address first, or turn the restriction off.',
  );
}

/** Turning the restriction on while the caller's address is not on the allowed list would lock them out. */
export function turnOnGuard(input: {
  allowRules: readonly IpRule[];
  myIp?: string | null;
  now?: number;
}): Guard {
  const { allowRules, myIp, now = Date.now() } = input;
  if (!myIp || isAllowed(allowRules, myIp, now)) return OK;
  return refuse(
    `Your own address (${myIp}) is not on the list, so turning this on would lock you out. Add it first.`,
  );
}
