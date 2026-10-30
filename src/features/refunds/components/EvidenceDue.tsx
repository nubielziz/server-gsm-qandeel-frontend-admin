// EvidenceDue: the "Evidence due" cell of a dispute. Ports `dueText` and the due column of tabDisputes in 53-p-refunds.js: the
// time left (critical colour inside three days) while evidence is needed, else when it was sent or closed.
import { ageText, ago } from '@/lib/format';
import { msLeft, URGENT_MS } from '../lib/deadline';
import type { Dispute } from '../types';

export function EvidenceDue({ dispute, now }: { dispute: Dispute; now: number }) {
  if (dispute.status !== 'needs_response') {
    const text =
      dispute.status === 'under_review'
        ? `Sent ${ago(dispute.submittedAt, now)}`
        : `Closed ${ago(dispute.resolvedAt, now)}`;
    return <span className="text-ink3">{text}</span>;
  }
  const left = msLeft(dispute.evidenceDueAt, now);
  if (left === null) return <span className="text-ink3">–</span>;
  if (left <= 0) return <span className="text-ink3">{ageText(-left)} ago</span>;
  return (
    <span className={left < URGENT_MS ? 'font-medium text-crit-fg' : undefined}>in {ageText(left)}</span>
  );
}
