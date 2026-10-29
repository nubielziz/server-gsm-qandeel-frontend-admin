// Mock of the two lookups the order list's menus read: the suppliers and the merchants by name. The suppliers and merchants
// features will serve these routes with their full rows; until then the orders feature's lookups are answered here.
import type { HttpHandler } from 'msw';
import { clientOptions, supplierOptions } from '../orders';
import { readHandlers } from './accessShared';

export const orderLookupHandlers: HttpHandler[] = [
  ...readHandlers({
    base: '/admin/suppliers',
    what: 'supplier',
    searchFields: ['name'],
    source: async () => ({ rows: await supplierOptions(), toDto: (row) => row }),
  }),
  ...readHandlers({
    base: '/admin/clients',
    what: 'merchant',
    searchFields: ['name'],
    source: async () => ({ rows: await clientOptions(), toDto: (row) => row }),
  }),
];
