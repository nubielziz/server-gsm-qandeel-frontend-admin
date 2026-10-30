// ScoringPanel: "How scoring works": the bar and the three bands made by the hold and block lines. Ports the right-hand panel of
// `tabRules` in 54-p-risk.js. The numbers are the rules' current values; the server does the scoring.
import { Panel } from '@/components/ui';
import { scoringBands } from '../lib/rules';
import type { RiskRule } from '../types';

export function ScoringPanel({ rules }: { rules: readonly RiskRule[] }) {
  const bands = scoringBands(rules);
  if (!bands) return null;
  const { hold, block } = bands;
  return (
    <Panel title="How scoring works" flush>
      <div className="space-y-3 p-3.5 text-sm text-ink2">
        <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
          <i className="bg-good-dot" style={{ width: `${hold}%` }} />
          <i className="bg-warn-dot" style={{ width: `${Math.max(0, block - hold)}%` }} />
          <i className="bg-crit-dot" style={{ width: `${Math.max(0, 100 - block)}%` }} />
        </div>
        <ul className="m-0 list-none space-y-1.5 p-0">
          <li>
            <span className="font-medium text-good-fg">0 to {hold - 1}</span> goes straight to the supplier.
          </li>
          <li>
            <span className="font-medium text-warn-fg">
              {hold} to {block - 1}
            </span>{' '}
            is held for a person.
          </li>
          <li>
            <span className="font-medium text-crit-fg">{block} and up</span> is refused before the customer
            pays.
          </li>
        </ul>
        <p className="text-xs text-ink3">
          Typical signals: a new customer with a large first order (+18), a disposable mailbox (+22), a card
          from another country than the IP (+25), an email tied to a past chargeback (+40).
        </p>
      </div>
    </Panel>
  );
}
