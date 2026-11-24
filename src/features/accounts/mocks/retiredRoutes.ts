// The retired routes of the old customers feature: every `/admin/customers*` row (the twelve map rows and the five wallet rows) stays
// registered on the server for now and answers 410 `ROUTE_RETIRED`. The mock does the same, so
// a screen still calling one gets the server's answer instead of an unhandled request. The rows are deleted from the server later.
import { http, type HttpHandler } from 'msw';
import { guard } from '@/mocks/session';
import { problem } from '@/mocks/problem';

const retired = () =>
  problem(
    410,
    'ROUTE_RETIRED',
    'This route is retired',
    'Customers are accounts now. Use /admin/clients instead.',
  );

export const retiredRoutes: HttpHandler[] = [
  http.all('*/admin/customers', ({ request }) => guard(request) ?? retired()),
  http.all('*/admin/customers/*', ({ request }) => guard(request) ?? retired()),
];
