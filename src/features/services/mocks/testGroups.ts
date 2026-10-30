// The merchant groups of the demo as the merchants feature's route (`GET /admin/client-groups`) will serve them, for tests. The feature's own
// mock layer does not register this: the merchants feature serves the real route. A test that needs the groups calls
// `mockServer.use(...groupHandlers)`, so it does not depend on that feature's seed. After both features merge, read the groups from the
// merchants mock store and delete this file (HANDOFF, SHARED-NEEDS).
import { http, type HttpHandler } from 'msw';
import { listAnswer, signedIn } from './http';
import { servicesStore } from './store';

export const groupHandlers: HttpHandler[] = [
  http.get('*/admin/client-groups', ({ request }) =>
    signedIn(request, async () => {
      const stores = await servicesStore();
      const rows = stores.groups.map((group) => ({
        id: group.id,
        name: group.name,
        kind: group.kind,
        discountPercent: group.discountPercent.toFixed(2),
        merchantCount: [...stores.merchants.values()].filter((merchant) => merchant.groupId === group.id)
          .length,
      }));
      return listAnswer(rows, request, ['name']);
    }),
  ),
];
