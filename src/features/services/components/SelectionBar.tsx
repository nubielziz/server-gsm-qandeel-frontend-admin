// SelectionBar: the strip above the services table when rows are ticked: how many, then "Change their prices…" and "Publish to the
// shop…" for them, and Clear. The demo had no row selection; the map's bulk price change can target "selected services", so the
// table gets tick boxes. Publishing starts a preview of the ticked services on the Storefront page's Publish tab (backend feature 31).
import { Button, Icon } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';

export interface SelectionBarProps {
  count: number;
  grants: ServiceGrants;
  onBulk: () => void;
  /** Starts a publish preview of the ticked services. */
  onPublish: () => void;
  /** True while the request that starts the preview is on its way. */
  publishing: boolean;
  onClear: () => void;
}

/** Shown only while some services are ticked. */
export function SelectionBar({ count, grants, onBulk, onPublish, publishing, onClear }: SelectionBarProps) {
  if (count === 0) return null;
  const lock = grants.needs('pricing:update');
  const publishLock = grants.needs('storefront:create');
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2"
      role="region"
      aria-label="Selected services"
    >
      <span className="text-sm font-medium text-accent-ink">{count} selected</span>
      <span className="flex-1" />
      <Button size="sm" disabled={lock.disabled} title={lock.title} onClick={onBulk}>
        <Icon name="percent" className="ic-sm" />
        Change their prices…
      </Button>
      <Button
        size="sm"
        loading={publishing}
        disabled={publishLock.disabled}
        title={publishLock.title}
        onClick={onPublish}
      >
        <Icon name="upload" className="ic-sm" />
        Publish to the shop…
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
