// RetailChangesBar: the "With selected" strip under the price changes: "Check All / Uncheck All", then "Apply the new price" and "Keep the
// current price" for the ticked proposals that wait. The server decides what each id gets; a row that is not waiting is skipped. The buttons
// are off while nothing is ticked (the strip does that), and while a resolve request runs, so they cannot send twice.
import { Button, Icon, WithSelected } from '@/components/ui';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';

export interface RetailChangesBarProps {
  /** How many changes are ticked. */
  count: number;
  grants: StorefrontGrants;
  /** True while a resolve request runs. */
  busy: boolean;
  onCheckAll: () => void;
  onUncheckAll: () => void;
  onApply: () => void;
  onKeep: () => void;
}

/** The strip; the two buttons need pricing:update and say so when the role lacks it. */
export function RetailChangesBar({
  count,
  grants,
  busy,
  onCheckAll,
  onUncheckAll,
  onApply,
  onKeep,
}: RetailChangesBarProps) {
  const lock = grants.needs('pricing:update');
  const disabled = lock.disabled || busy;
  return (
    <WithSelected count={count} onCheckAll={onCheckAll} onUncheckAll={onUncheckAll}>
      <Button size="sm" disabled={disabled} title={lock.title} onClick={onApply}>
        <Icon name="check" className="ic-sm" />
        Apply the new price
      </Button>
      <Button size="sm" disabled={disabled} title={lock.title} onClick={onKeep}>
        Keep the current price
      </Button>
    </WithSelected>
  );
}
