// Mock routes of the order pipeline: `GET /admin/system/orders-health` and `GET /admin/system/suppliers`. Pausing a
// supplier is the suppliers feature's `PATCH /admin/suppliers/:id`; its rows are read here, so the pause shows up.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { OrdersHealth, SuppliersHealth } from '../../types';
import { buildOrdersHealth, buildSuppliers } from '../buildPipeline';
import { route, supplierRows } from '../http';

export const pipelineRoutes: HttpHandler[] = [
  http.get(
    '*/admin/system/orders-health',
    route({ gate: 'ordersHealth' }, ({ state, now }) =>
      HttpResponse.json<OrdersHealth>(buildOrdersHealth(state, now)),
    ),
  ),

  http.get(
    '*/admin/system/suppliers',
    route({}, async ({ state, now }) =>
      HttpResponse.json<SuppliersHealth>(buildSuppliers(state, await supplierRows(), now)),
    ),
  ),
];
