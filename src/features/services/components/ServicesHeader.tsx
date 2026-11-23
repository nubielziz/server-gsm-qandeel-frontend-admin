// ServicesHeader: the Catalog page's header in its table view: the title, the below-floor sentence and the page's actions. Ports the
// `head` of pageServices in 43-p-services.js. The number comes from the server (a list call with `belowFloor=true`) and links to
// those services; the demo's "Sync supplier costs" button is not ported (MISMATCHES M96). The actions are Add services (the one way
// in for new services, a service of one's own included), the bulk price change the map adds, the link to the Catalog settings and a
// "⋯" menu that opens the publish runs. The two links leave the page, so they go through the panel's guard (`onLeave`).
import { Link } from 'react-router';
import type { LeaveGate } from './panel/types';
import { Button, ButtonLink, Icon, Menu, PageHeader, usePopover, type MenuItem } from '@/components/ui';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { useAddServicesAddress } from '../hooks/useAddServicesAddress';
import { useLeaveClick } from '../hooks/useLeaveClick';
import { ADD_SERVICES_PERMISSION } from '../lib/addAddress';
import { catalogPath } from '../lib/paths';
import { CATALOG_HEADING, PUBLISH_PERMISSION } from '../lib/tabs';

export interface ServicesHeaderProps {
  grants: ServiceGrants;
  /** Active services under their floor, as the server counts them; undefined while it loads or cannot be read. */
  belowFloor: number | undefined;
  onBulk: () => void;
  /** Opens the publish view (its start: what to publish and the earlier runs). The page asks about unsaved changes first. */
  onPublishRuns: () => void;
  /** Asks about unsaved changes in the open panel before a link of the header leaves the page; without it the links just go. */
  onLeave?: LeaveGate;
}

/** What the sub line says: the count of services under their floor, in the demo's words; the count lists them. */
function floorSentence(count: number | undefined, leave: ReturnType<typeof useLeaveClick>) {
  if (count === undefined) return undefined;
  if (count === 0) return 'Every active service is priced above its floor.';
  const to = catalogPath({ belowFloor: true });
  return (
    <>
      <Link to={to} onClick={leave(to)} className="font-medium text-serious-fg hover:underline">
        {count} {count === 1 ? 'service is' : 'services are'} priced below cost plus minimum profit.
      </Link>{' '}
      Orders are charged the floor price until you update it.
    </>
  );
}

/** The "⋯" menu of the header: the views that are not part of the table's daily work. */
function MoreMenu({ grants, onPublishRuns }: Pick<ServicesHeaderProps, 'grants' | 'onPublishRuns'>) {
  const pop = usePopover();
  const publish = grants.needs(PUBLISH_PERMISSION);
  const items: MenuItem[] = [
    {
      label: 'Publish runs',
      icon: 'store',
      disabled: publish.disabled,
      title: publish.title,
      run: onPublishRuns,
    },
  ];
  return (
    <>
      <Button
        ref={pop.anchorRef}
        icon
        aria-label="More catalog actions"
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="more" className="ic-sm" />
      </Button>
      <Menu {...pop.panelProps} items={items} width={200} label="More catalog actions" />
    </>
  );
}

/**
 * The title, the floor sentence and the actions. "Add services" opens the flow by writing `?add=new` into the address (the host the
 * page mounts shows it), so the filters and the open service stay as they are.
 */
export function ServicesHeader({ grants, belowFloor, onBulk, onPublishRuns, onLeave }: ServicesHeaderProps) {
  const addFlow = useAddServicesAddress();
  const leave = useLeaveClick(onLeave);
  const settingsPath = catalogPath({ view: 'settings' });
  const bulkLock = grants.needs('pricing:update');
  const addLock = grants.needs(ADD_SERVICES_PERMISSION);
  return (
    <PageHeader
      title={CATALOG_HEADING}
      sub={floorSentence(belowFloor, leave)}
      actions={
        <>
          <ButtonLink to={settingsPath} onClick={leave(settingsPath)}>
            <Icon name="sliders" className="ic-sm" />
            Catalog settings
          </ButtonLink>
          <Button disabled={bulkLock.disabled} title={bulkLock.title} onClick={onBulk}>
            <Icon name="percent" className="ic-sm" />
            Bulk price change…
          </Button>
          <Button
            variant="primary"
            disabled={addLock.disabled}
            title={addLock.title}
            onClick={() => addFlow.open()}
          >
            <Icon name="plus" className="ic-sm" />
            Add services
          </Button>
          <MoreMenu grants={grants} onPublishRuns={onPublishRuns} />
        </>
      }
    />
  );
}
