// ApiCell: the API column of a row of the All view: the supplier connection that fulfils the service (the first active link by priority),
// and under it, in small italics, the one that takes over when it fails. Empty when the service has none.
import type { Service } from '../../../types';

/** The supplier's name, then "then <fallback>" when a second connection is saved. */
export function ApiCell({ service }: { service: Pick<Service, 'supplier' | 'fallbackSupplier'> }) {
  if (!service.supplier) return null;
  return (
    <>
      <span className="block">{service.supplier.name}</span>
      {service.fallbackSupplier && (
        <span className="cell-sub">{`then ${service.fallbackSupplier.name}`}</span>
      )}
    </>
  );
}
