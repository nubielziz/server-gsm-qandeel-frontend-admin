// The ranks of the demo as the accounts feature's route (`GET /admin/client-groups`) serves them, for tests. The feature's own mock layer
// does not register this: the accounts feature serves the real route. A test that needs the ranks calls `mockServer.use(...groupHandlers)`,
// so it does not depend on that feature's seed. After both features merge, read the ranks from the accounts mock store and delete this
// file (HANDOFF, SHARED-NEEDS).
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
        accountCount: [...stores.merchants.values()].filter((merchant) => merchant.groupId === group.id)
          .length,
      }));
      return listAnswer(rows, request, ['name']);
    }),
  ),
];
