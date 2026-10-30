// Mock of the supplier lookup the order list's menus read. The suppliers feature will serve this route with its full rows;
// until then it is answered here. (`/admin/clients` is the merchants feature's own mock.)
import type { HttpHandler } from 'msw';
import { supplierOptions } from '../orders';
import { readHandlers } from './accessShared';

export const orderLookupHandlers: HttpHandler[] = [
  ...readHandlers({
    base: '/admin/suppliers',
    what: 'supplier',
    searchFields: ['name'],
    source: async () => ({ rows: await supplierOptions(), toDto: (row) => row }),
  }),
];
