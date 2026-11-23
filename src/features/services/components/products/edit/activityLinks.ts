// The addresses the Activity part links to. The orders list takes a search, and the service's name is what it can search by (the server's
// `q` reads the service name); the price check is a tab of the Price Rules view, and it chooses its service from `service=<id>`.
import type { Id } from '@/lib/api';
import { ordersListPath } from '@/features/orders';
import type { ServiceType } from '@/lib/serviceTypes';
import { productsPath } from '../../../lib/productsPath';

/** The Orders page, on every order (not only the open ones), searched for the service's name. */
export function serviceOrdersPath(name: string): string {
  return ordersListPath({ tab: 'all', q: name });
}

/**
 * The price check of the Price Rules view with this service chosen. The page's address builder has no key for the service, so the key
 * is added to the address it builds for the check.
 */
export function priceCheckPath(type: ServiceType, serviceId: Id): string {
  const base = productsPath({ view: 'rules', type, tab: 'check' });
  return `${base}&service=${serviceId}`;
}
