// Reads the server's answer to "what would happen to this address?" the way the demo's ipVerdict result was read.
// The server answers `allowed` or `refused` plus the rule that decided; the screens want the reason in four cases.
import type { CheckIpResult, IpRule } from '../types';

/** `blocked`: a block rule refused it. `not_listed`: the console is restricted and the address is not allowed.
 * `allowed`: an allowed-list rule lets it in. `open`: no rule applies, so it can connect. */
export type VerdictWhy = 'blocked' | 'not_listed' | 'allowed' | 'open';

export type Verdict = { ok: boolean; why: VerdictWhy; rule: IpRule | null };

/**
 * Turns the server's answer into the reason the screens show.
 */
export function readVerdict(result: CheckIpResult): Verdict {
  const rule = result.rule;
  if (result.decision === 'refused') {
    return rule ? { ok: false, why: 'blocked', rule } : { ok: false, why: 'not_listed', rule: null };
  }
  return rule ? { ok: true, why: 'allowed', rule } : { ok: true, why: 'open', rule: null };
}
