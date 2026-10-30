// ServicesHeader: the page title, the below-floor sentence and the page's two actions. Ports the `head` of pageServices in
// 43-p-services.js. The number comes from the server (a list call with `belowFloor=true`); the demo's "Sync supplier costs"
// button is not ported (MISMATCHES M96). The actions are New service and the bulk price change the map adds.
import { Button, Icon, PageHeader } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';

export interface ServicesHeaderProps {
  grants: ServiceGrants;
  /** Active services under their floor, as the server counts them; undefined while it loads or cannot be read. */
  belowFloor: number | undefined;
  onBulk: () => void;
  onCreate: () => void;
}

/** What the sub line says: the count of services under their floor, in the demo's words. */
function floorSentence(count: number | undefined) {
  if (count === undefined) return undefined;
  if (count === 0) return 'Every active service is priced above its floor.';
  return (
    <>
      <span className="font-medium text-serious-fg">
        {count} {count === 1 ? 'service is' : 'services are'} priced below cost plus minimum profit.
      </span>{' '}
      Orders are charged the floor price until you update it.
    </>
  );
}

/** The title, the floor sentence and the two actions. */
export function ServicesHeader({ grants, belowFloor, onBulk, onCreate }: ServicesHeaderProps) {
  const bulkLock = grants.needs('pricing:update');
  const createLock = grants.needs('catalog:create');
  return (
    <PageHeader
      title="Services & pricing"
      sub={floorSentence(belowFloor)}
      actions={
        <>
          <Button disabled={bulkLock.disabled} title={bulkLock.title} onClick={onBulk}>
            <Icon name="percent" className="ic-sm" />
            Bulk price change…
          </Button>
          <Button
            variant="primary"
            disabled={createLock.disabled}
            title={createLock.title}
            onClick={onCreate}
          >
            <Icon name="plus" className="ic-sm" />
            New service
          </Button>
        </>
      }
    />
  );
}
