// Types for a merchant's API keys (`/admin/clients/:id/api-keys`, `/admin/api-keys/:id`). The map gives no bodies (MISMATCHES M10),
// so every shape below is an assumed contract built from the generated rows.
import type { IsoDateTime } from '@/lib/api';
import type { ApiKeyRow } from '@/lib/api/schema.gen';

/**
 * One API key of a merchant, without its secret: only the prefix is ever readable (the generated row, plus `createdByStaff`). A
 * key is a Dhru credential: the `scopes` an older backend still sends are not read or shown.
 */
export type ApiKey = Pick<
  ApiKeyRow,
  | 'id'
  | 'clientId'
  | 'name'
  | 'prefix'
  | 'allowedIps'
  | 'rateLimitPerMin'
  | 'lastUsedAt'
  | 'lastUsedIp'
  | 'expiresAt'
  | 'revokedAt'
  | 'createdAt'
> & {
  /** True for a key staff made for the merchant (feature 20); the server always sends it. */
  createdByStaff?: boolean;
};

/**
 * Body of `POST /admin/clients/:id/api-keys` (backend feature 20): the merchant's own creation plus the per-minute limit.
 * `name` 1-60 characters, `allowedIps` up to 20 addresses or ranges (empty: any address), `expiresAt` an ISO time in the future,
 * `rateLimitPerMin` an integer from 1 to 6000 (the server's default is 60). The scope list is not part of it: see `createClientApiKey`.
 */
export type CreateApiKeyBody = {
  name: string;
  allowedIps?: string[];
  expiresAt?: IsoDateTime;
  rateLimitPerMin?: number;
};

/** The answer of `POST /admin/clients/:id/api-keys`: the new key's row and the full key, which is shown once and never again. */
export type CreatedApiKey = { key: ApiKey; secret: string };

/** Body of `PATCH /admin/api-keys/:id`: at least one of the two. An empty `allowedIps` removes the restriction. */
export type UpdateApiKeyBody = { rateLimitPerMin?: number; allowedIps?: string[] };
