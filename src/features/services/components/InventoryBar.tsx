// InventoryBar: the strip above the code stock when rows are ticked: how many, how many of them are unsold, and the button that voids
// the unsold ones. Only unsold codes can be voided; the server skips the others and says so.
import { Button, Icon } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';

export interface InventoryBarProps {
  selected: number;
  unsold: number;
  grants: ServiceGrants;
  onVoid: () => void;
  onClear: () => void;
}

/** Shown only while some codes are ticked. */
export function InventoryBar({ selected, unsold, grants, onVoid, onClear }: InventoryBarProps) {
  if (selected === 0) return null;
  const lock = grants.needs('inventory:write');
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2"
      role="region"
      aria-label="Selected codes"
    >
      <span className="text-sm font-medium text-accent-ink">{selected} selected</span>
      <span className="text-xs text-ink2">{unsold} unsold</span>
      <span className="flex-1" />
      <Button
        size="sm"
        variant="danger"
        disabled={lock.disabled || unsold === 0}
        title={lock.title ?? (unsold === 0 ? 'None of the ticked codes is unsold' : undefined)}
        onClick={onVoid}
      >
        <Icon name="ban" className="ic-sm" />
        Void selected unsold codes…
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
