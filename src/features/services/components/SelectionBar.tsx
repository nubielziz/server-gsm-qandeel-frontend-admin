// SelectionBar: the strip above the Catalog table while services are ticked: Set category, Change their prices…, Put on the shop, Take off
// the shop, Switch off and Clear. Each button counts only the ticked services it would change and carries its permission; a progress line
// replaces them while a bulk action runs. The shop buttons show only when the rows carry their shop page (the role may read the shop).
import { Button, Icon } from '@/components/ui';
import type { RunProgress } from '@/lib/bulk';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { bulkTargets } from '../hooks/useCatalogBulk';
import type { Service, ServiceCategory } from '../types';
import { CategoryMenu } from './table/CategoryMenu';

export interface SelectionBarProps {
  /** The ticked services of this page. */
  services: readonly Service[];
  grants: ServiceGrants;
  /** The rows carry their shop page: the shop buttons are offered. */
  shop: boolean;
  categories: readonly ServiceCategory[];
  progress: RunProgress | null;
  /** The publish run of "Put on the shop" is being made. */
  starting: boolean;
  onSetCategory: (category: ServiceCategory) => void;
  onBulkPrice: () => void;
  onPutOn: () => void;
  onTakeOff: () => void;
  onSwitchOff: () => void;
  onClear: () => void;
}

/** A lock for a button that has nothing to change among the ticked services. */
const none = (title: string) => ({ disabled: true, title });

/** Shown only while some services are ticked. */
export function SelectionBar(props: SelectionBarProps) {
  const { services, grants, shop, progress, starting } = props;
  if (services.length === 0) return null;
  const targets = bulkTargets(services);
  const update = grants.needs('catalog:update');
  const putOnCount = targets.publish.length + targets.switchOn.length;
  // The run needs storefront:create; switching a page back on needs storefront:update and storefront:publish.
  const putOnLock =
    putOnCount === 0
      ? none('Every ticked service is on the shop already')
      : grants.needsAll(
          ...(targets.publish.length > 0 ? ['storefront:create'] : []),
          ...(targets.switchOn.length > 0 ? ['storefront:update', 'storefront:publish'] : []),
        );
  const takeOffLock =
    targets.takeOff.length === 0
      ? none('None of the ticked services is on the shop')
      : grants.needs('storefront:update');
  const switchOffLock =
    targets.switchOff.length === 0 ? none('Every ticked service is switched off already') : update;
  const working = progress !== null || starting;
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-line bg-accent-soft px-3.5 py-2"
      role="region"
      aria-label="Selected services"
    >
      <span className="text-sm font-medium text-accent-ink">{services.length} selected</span>
      <span className="flex-1" />
      {progress ? (
        <span className="text-sm text-ink2" role="status">
          {progress.verb} {progress.done} of {progress.total}…
        </span>
      ) : (
        <>
          <CategoryMenu categories={props.categories} lock={update} onPick={props.onSetCategory} />
          <Button size="sm" {...grants.needs('pricing:update')} onClick={props.onBulkPrice}>
            <Icon name="percent" className="ic-sm" />
            Change their prices…
          </Button>
          {shop && (
            <>
              <Button size="sm" loading={starting} {...putOnLock} onClick={props.onPutOn}>
                <Icon name="upload" className="ic-sm" />
                Put on the shop
              </Button>
              <Button
                size="sm"
                disabled={takeOffLock.disabled || working}
                title={takeOffLock.title}
                onClick={props.onTakeOff}
              >
                <Icon name="download" className="ic-sm" />
                Take off the shop
              </Button>
            </>
          )}
          <Button
            size="sm"
            disabled={switchOffLock.disabled || working}
            title={switchOffLock.title}
            onClick={props.onSwitchOff}
          >
            <Icon name="ban" className="ic-sm" />
            Switch off
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" disabled={working} onClick={props.onClear}>
        Clear
      </Button>
    </div>
  );
}
