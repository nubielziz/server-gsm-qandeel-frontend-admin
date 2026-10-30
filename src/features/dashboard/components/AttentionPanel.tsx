// AttentionPanel: "Needs attention", the work queue first. Shows the first six items the server ranked and a "Show n more"
// toggle for the rest; "All clear" when there are none. Ports attentionPanel() of 40-p-dashboard.js.
import { useState } from 'react';
import { Button, cx, EmptyState, Icon, Panel, SkeletonTable } from '@/components/ui';
import { useNow } from '@/lib/format';
import type { AttentionItem, DashboardScope } from '../types';
import { AttentionRow } from './AttentionRow';

/** Items shown before "Show more" (the demo's ATTN_CAP). */
export const ATTENTION_CAP = 6;

export interface AttentionPanelProps {
  /** `undefined` while the dashboard loads. */
  items: AttentionItem[] | undefined;
  scope: DashboardScope;
}

/** The attention list in the server's order (the server decides what is urgent), capped at six with a toggle for the rest. */
export function AttentionPanel({ items, scope }: AttentionPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const now = useNow();
  if (!items) {
    return (
      <Panel title="Needs attention" flush>
        <SkeletonTable cols={3} rows={4} />
      </Panel>
    );
  }
  const shown = showAll ? items : items.slice(0, ATTENTION_CAP);
  const more = items.length - ATTENTION_CAP;
  return (
    <Panel
      id="attention"
      title="Needs attention"
      sub={items.length ? `${items.length} open, most urgent first` : undefined}
      flush
    >
      {items.length ? (
        <>
          <ul id="attn-list" className="m-0 list-none divide-y divide-line p-0">
            {shown.map((item) => (
              <AttentionRow key={item.id} item={item} scope={scope} now={now} />
            ))}
          </ul>
          {more > 0 && (
            <div className="border-t border-line px-3.5 py-2">
              {/* The same button stays mounted, so keyboard focus stays on the toggle after it is pressed. */}
              <Button
                variant="ghost"
                size="sm"
                className="-ms-2.5"
                aria-expanded={showAll}
                aria-controls="attn-list"
                onClick={() => setShowAll((open) => !open)}
              >
                <Icon name="chevD" className={cx('ic-sm transition-transform', showAll && 'rotate-180')} />
                {showAll ? 'Show fewer' : `Show ${more} more`}
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon="checkCircle" title="All clear">
          No late orders, supplier problems or pending approvals right now.
        </EmptyState>
      )}
    </Panel>
  );
}
