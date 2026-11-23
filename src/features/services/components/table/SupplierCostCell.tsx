// SupplierCostCell: who fills a Catalog row's orders (the primary supplier, from the server's chain) and what it costs, with an arrow when
// the supplier changed the cost since the price was set. The fallback supplier and the whole chain are in the service's panel.
import { Icon } from '@/components/ui';
import { money } from '@/lib/format';
import type { Service } from '../../types';

/** Supplier name (or "No supplier") over the cost. */
export function SupplierCostCell({ service }: { service: Service }) {
  return (
    <>
      {service.supplier ? (
        <span className="block max-w-[180px] truncate">{service.supplier.name}</span>
      ) : (
        <span className="block text-ink3">No supplier</span>
      )}
      <span className="block text-xs tabular-nums text-ink2">
        {service.costChangedFrom && (
          <>
            <span
              className="text-warn-fg"
              title={`Supplier changed this from ${money(service.costChangedFrom)}`}
            >
              <Icon name="arrowUp" className="ic-xs inline" />
              <span className="sr-only">Supplier changed this from {money(service.costChangedFrom)}. </span>
            </span>{' '}
          </>
        )}
        Cost {money(service.cost)}
      </span>
    </>
  );
}
