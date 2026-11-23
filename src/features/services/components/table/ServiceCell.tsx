// ServiceCell: the first cell of a Catalog row: the name as a button (the keyboard way into the service's side panel; it names the
// service in the address), the code, the category, the quantity rule when it is not one, and the attention badges.
import { cx } from '@/components/ui';
import { quantityText } from '@/lib/format';
import type { PanelSection } from '../../hooks/useServiceView';
import { rowOpenerProps } from '../../lib/panelFocus';
import type { Service } from '../../types';
import { AttentionBadges } from './AttentionBadges';

export interface ServiceCellProps {
  service: Service;
  /** The service's side panel is open: the name button says it is the current one. */
  open?: boolean;
  onOpen: (service: Service, section?: PanelSection) => void;
}

/** Name, code, category, quantity and the reasons to look. */
export function ServiceCell({ service, open = false, onOpen }: ServiceCellProps) {
  const quantity = quantityText(service);
  return (
    <>
      <button
        type="button"
        className={cx(
          'block max-w-[300px] truncate text-left font-medium hover:underline',
          service.status === 'disabled' && 'text-ink3',
        )}
        aria-current={open ? 'true' : undefined}
        {...rowOpenerProps(service.id)}
        onClick={() => onOpen(service)}
      >
        {service.name}
      </button>
      <span className="mono text-xs text-ink3">{service.code}</span>
      {service.category && <span className="block text-xs text-ink3">{service.category.name}</span>}
      {quantity !== '1' && <span className="block text-xs text-ink3">Qty {quantity}</span>}
      <AttentionBadges service={service} onOpen={onOpen} />
    </>
  );
}
