// RetailChangesBar: the strip above the price changes when rows are ticked: how many, then "Apply the new price" and "Keep the
// current price" for the ones that wait, and Clear. The server decides what each id gets; a row that is not waiting is skipped.
import { Button, Icon } from '@/components/ui';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';

export interface RetailChangesBarProps {
  count: number;
  grants: StorefrontGrants;
  /** True while a resolve request runs, so the buttons cannot send twice. */
  busy: boolean;
  onApply: () => void;
  onKeep: () => void;
  onClear: () => void;
}

/** Shown only while some changes are ticked. */
export function RetailChangesBar({ count, grants, busy, onApply, onKeep, onClear }: RetailChangesBarProps) {
  if (count === 0) return null;
  const lock = grants.needs('pricing:update');
  const disabled = lock.disabled || busy;
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2"
      role="region"
      aria-label="Selected price changes"
    >
      <span className="text-sm font-medium text-accent-ink">{count} selected</span>
      <span className="flex-1" />
      <Button size="sm" variant="primary" disabled={disabled} title={lock.title} onClick={onApply}>
        <Icon name="check" className="ic-sm" />
        Apply the new price
      </Button>
      <Button size="sm" disabled={disabled} title={lock.title} onClick={onKeep}>
        Keep the current price
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
