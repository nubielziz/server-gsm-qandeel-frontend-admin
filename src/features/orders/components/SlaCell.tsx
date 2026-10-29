// SlaCell: the SLA column. Ports slaCell of 41-p-orders.js: a closed order shows how long it took; an order waiting
// for review shows its age; a late order shows "Late by …" in critical text and no bar (a full red bar adds nothing,
// DESIGN.md); the rest show their age with a bar that fills toward the target and turns warn at 70%.
import { Icon, Meter } from '@/components/ui';
import { dur } from '@/lib/format';
import { ageText, slaView } from '../lib/sla';
import type { Order } from '../types';

/** Display only: the numbers come from `createdAt` and the service's SLA minutes, never from a server decision. */
export function SlaCell({ order, now }: { order: Order; now: number }) {
  const view = slaView(order, now);

  if (view.kind === 'done') {
    return (
      <span
        className="tabular-nums text-ink3"
        title={`Created to ${order.status === 'completed' ? 'completed' : 'rejected'}`}
      >
        {view.took === null ? '–' : dur(view.took)}
      </span>
    );
  }
  if (view.kind === 'review') {
    return (
      <div className="min-w-[96px] whitespace-nowrap">
        <p className="tabular-nums text-ink2">{ageText(view.age)}</p>
        <p className="text-2xs text-ink3">waiting for review</p>
      </div>
    );
  }
  if (view.kind === 'late') {
    return (
      <div className="min-w-[112px] whitespace-nowrap">
        <p className="font-medium tabular-nums text-crit-fg">
          <Icon name="clock" className="ic-xs me-1 inline" />
          {ageText(view.age)}
        </p>
        <p className="text-2xs text-crit-fg">Late by {ageText(view.over)}</p>
      </div>
    );
  }
  return (
    <div className="flex min-w-[112px] items-center gap-2 whitespace-nowrap">
      <div className="min-w-0">
        <p className={`tabular-nums ${view.ratio >= 0.7 ? 'text-warn-fg' : 'text-ink2'}`}>
          {ageText(view.age)}
        </p>
        <Meter ratio={view.ratio} className="mt-1 w-14" />
      </div>
      <span className="text-2xs text-ink3">of {ageText(view.sla)}</span>
    </div>
  );
}
