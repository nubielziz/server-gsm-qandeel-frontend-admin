// PriceCell: a service's base price in the table. Ports the `price` column of servicesTab in 43-p-services.js: a button that opens Edit
// price (plain text for a role that cannot edit), in red with an alert icon and the floor price underneath when the server says the
// price is under the floor. The floor and the flag are the server's; nothing is compared here.
import { cx, Icon } from '@/components/ui';
import { money } from '@/lib/format';
import type { Service } from '../types';

export interface PriceCellProps {
  service: Service;
  /** Props for a role that lacks `catalog:update`: the price becomes plain text with the reason as its title. */
  lock: { disabled: boolean; title?: string };
  onEdit: (service: Service) => void;
}

/** The price, and its edit button when the role may edit. */
export function PriceCell({ service, lock, onEdit }: PriceCellProps) {
  const tone = service.belowFloor && 'font-medium text-crit-fg';
  const label = (
    <>
      {service.belowFloor && <Icon name="alert" className="ic-xs" />}
      {money(service.basePrice)}
      {!lock.disabled && <Icon name="edit" className="ic-xs text-ink3" />}
    </>
  );
  return (
    <>
      {lock.disabled ? (
        <span className={cx('inline-flex items-center gap-1', tone)} title={lock.title}>
          {label}
        </span>
      ) : (
        <button
          type="button"
          className={cx('-mx-1 inline-flex items-center gap-1 rounded px-1 hover:bg-hover', tone)}
          aria-label={`Edit price of ${service.name}, now ${money(service.basePrice)}`}
          onClick={() => onEdit(service)}
        >
          {label}
        </button>
      )}
      {service.belowFloor && <p className="text-xs text-crit-fg">Floor {money(service.floorPrice)}</p>}
    </>
  );
}
