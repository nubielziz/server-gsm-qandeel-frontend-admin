// A read-only view of the supplier chain of one service, for the Catalog join of the services mock (`GET /admin/services`): who is its
// primary supplier and its fallback. It reads the links as they are when it is called, so a chain saved a moment ago shows. It changes
// nothing and never reads the services or storefront mocks.
import { chainOf } from './seed';
import { suppliersState } from './store';

/** A supplier as a service row names it. */
export type SupplierRef = { id: number; name: string };

/** The chain of one service as the service rows need it. */
export type ChainFacts = {
  /** The first link by priority (the primary supplier), or `null` when the service has no supplier link. */
  primary: SupplierRef | null;
  /** The second link, or `null`. */
  fallback: SupplierRef | null;
  /** At least one link exists (every link of the mock is active). */
  linked: boolean;
};

/** The supplier chain of any service by id; call it once per request and use the function for every row. */
export async function chainFactsReader(): Promise<(serviceId: number) => ChainFacts> {
  const state = await suppliersState();
  return (serviceId) => {
    const chain = chainOf(state, serviceId);
    const [first, second] = chain;
    return {
      primary: first ? { id: first.supplierId, name: first.supplierName } : null,
      fallback: second ? { id: second.supplierId, name: second.supplierName } : null,
      linked: chain.length > 0,
    };
  };
}
