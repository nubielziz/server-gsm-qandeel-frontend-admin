// Mock routes of the data stores: `GET /admin/system/database` (Postgres) and `GET /admin/system/cache` (Redis).
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { CacheHealth, DatabaseHealth } from '../../types';
import { buildCache, buildDatabase } from '../buildStores';
import { route } from '../http';

export const storeRoutes: HttpHandler[] = [
  http.get(
    '*/admin/system/database',
    route({}, ({ state, now }) => HttpResponse.json<DatabaseHealth>(buildDatabase(state, now))),
  ),

  http.get(
    '*/admin/system/cache',
    route({}, ({ state, now }) => HttpResponse.json<CacheHealth>(buildCache(state, now))),
  ),
];
