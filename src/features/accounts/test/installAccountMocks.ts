// Test helper: puts the accounts mock routes first for every test of a file, and answers the one route this feature only reads
// (`GET /admin/services`, mocked by the services feature). Import it from tests only.
import { http, HttpResponse } from 'msw';
import { beforeEach } from 'vitest';
import { applyListQuery } from '@/mocks/crud';
import { mockServer } from '@/mocks/node';
import { toMoney } from '@/mocks/seed';
import { floorOf } from '../mocks/dto';
import { mocks } from '../mocks/index';
import { accountState } from '../mocks/store';

// The services of the demo seed, as the services feature lists them (id, name, type, status, floor price).
const servicesStub = http.get('*/admin/services', async ({ request }) => {
  const { services } = await accountState();
  const rows = [...services.values()].map((service) => ({
    id: service.id,
    name: service.name,
    type: service.type,
    status: 'active',
    floorPrice: toMoney(floorOf(service)),
  }));
  const { page, total } = applyListQuery(rows, new URL(request.url).searchParams);
  return HttpResponse.json(page, { headers: { 'x-total-count': String(total) } });
});

/**
 * Call once at the top of a test file, after `setupMockApi()`. Runtime handlers are cleared after each test, so they go in before each.
 * The accounts routes are also registered by the mock layer itself; this puts them (and the services stub) first.
 */
export function installAccountMocks(): void {
  beforeEach(() => {
    mockServer.use(...mocks.handlers, servicesStub);
  });
}
