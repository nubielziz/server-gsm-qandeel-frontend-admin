// LastsCell: how long an IP rule still lasts ("in 2d 3h"), or "Until removed". Ports IP_LEFT of 56-p-access.js.
import { leftText } from '../lib/ipRules';
import type { IpRule } from '../types';

export function LastsCell({ rule, now }: { rule: Pick<IpRule, 'expiresAt'>; now: number }) {
  const left = leftText(rule, now);
  return left ? <span className="text-ink2">{left}</span> : <span className="text-ink3">Until removed</span>;
}
