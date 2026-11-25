// A test helper: the 265 groups the shop held on 2026-11-25 (Server 217, IMEI 45, Remote 1, File 2; the last one is the "apple" the owner added), served by
// stateful handlers for `GET` and `POST /admin/service-categories` that read the range the console asks for (`_start`, `_end`) the way the server
// does. Import it from tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ServiceCategory, ServiceType } from '../types';

/** The kinds in the order of the ids: ids 1-217 are Server, 218-262 IMEI, 263 Remote, 264-265 File. */
const BLOCKS: readonly [ServiceType, number][] = [
  ['server', 217],
  ['imei', 45],
  ['remote', 1],
  ['file', 2],
];

/** The list as the server holds it: every id and every position is its place in the list, so ids and positions pass 200. */
export function manyGroups(): ServiceCategory[] {
  const groups: ServiceCategory[] = [];
  for (const [type, count] of BLOCKS) {
    for (let at = 0; at < count; at += 1) {
      const id = groups.length + 1;
      groups.push({
        id,
        name: `${type} group ${id}`,
        type,
        allowedGroupIds: [],
        sort: id - 1,
        isActive: true,
        serviceCount: 0,
      });
    }
  }
  groups[groups.length - 1].name = 'apple';
  return groups;
}

/**
 * The handlers over one list. `groups` changes when a group is added (the server gives it the next id and the next position, so it is last).
 * `reads` collects the address of every list request.
 */
export function manyGroupHandlers(groups: ServiceCategory[] = manyGroups()) {
  const reads: URL[] = [];
  const handlers: HttpHandler[] = [
    http.get('*/admin/service-categories', ({ request }) => {
      const url = new URL(request.url);
      reads.push(url);
      const start = Number(url.searchParams.get('_start') ?? 0);
      const end = Number(url.searchParams.get('_end') ?? groups.length);
      const sorted = [...groups].sort((a, b) => a.sort - b.sort);
      return HttpResponse.json(sorted.slice(start, end), {
        headers: { 'x-total-count': String(groups.length), 'access-control-expose-headers': 'x-total-count' },
      });
    }),
    http.post('*/admin/service-categories', async ({ request }) => {
      const body = (await request.json()) as Pick<
        ServiceCategory,
        'name' | 'type' | 'allowedGroupIds' | 'isActive'
      >;
      const next = Math.max(...groups.map((group) => group.id)) + 1;
      const created: ServiceCategory = { ...body, id: next, sort: next - 1, serviceCount: 0 };
      groups.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  ];
  return { groups, reads, handlers };
}
