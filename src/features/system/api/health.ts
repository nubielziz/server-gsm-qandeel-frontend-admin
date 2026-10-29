// The health route, polled by the sidebar footer.
import { apiGet, type ApiInit } from '@/lib/api';
import type { Health } from '../types';

/**
 * Service health: Postgres and Redis. Public, so it works before sign-in. Any 2xx answer means the API is
 * reachable; the body (assumed contract) says whether a dependency is down.
 * @route GET /health
 */
export function getHealth(init?: ApiInit): Promise<Health> {
  return apiGet<Health>('/health', undefined, init);
}
