// LinkedSuppliers: the supplier and the fallback of a service, read-only, each opening the Suppliers page on that supplier.
// Supplier links are made on the Suppliers page (`PUT /admin/services/:id/supplier-links` belongs to that feature).
import { Link } from 'react-router';
import { supplierLink } from '../lib/paths';
import type { Service } from '../types';

/** The supplier and the fallback, each a link. */
export function LinkedSuppliers({ service }: { service: Service }) {
  return (
    <div className="rounded-md bg-sunken p-2.5 text-sm">
      <p className="text-xs text-ink3">Suppliers are linked on the Suppliers page.</p>
      <p className="mt-1">
        Supplier:{' '}
        {service.supplier ? (
          <Link className="link" to={supplierLink(service.supplier.id)}>
            {service.supplier.name}
          </Link>
        ) : (
          'none'
        )}
        . Fallback:{' '}
        {service.fallbackSupplier ? (
          <Link className="link" to={supplierLink(service.fallbackSupplier.id)}>
            {service.fallbackSupplier.name}
          </Link>
        ) : (
          'none'
        )}
        .
      </p>
    </div>
  );
}
