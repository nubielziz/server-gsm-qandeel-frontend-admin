// Types of an account's API keys (`/admin/clients/:id/api-keys`, `/admin/api-keys/:id`): only an account with a merchant rank
// can hold keys. The map gives no bodies (MISMATCHES M10), so every shape below is an assumed contract built from the generated rows.
import type { Id, IsoDateTime } from '@/lib/api';

/**
 * One API key of an account, without its secret: only the prefix is ever readable. A key is a Dhru credential: the `scopes` an
 * older backend still sends are not read or shown. `clientId` is the owner's account id (the key table keeps its column name).
 */
export type ApiKey = {
  id: Id;
  clientId: Id;
  name: string;
  prefix: string;
  allowedIps: string[];
  rateLimitPerMin: number;
  lastUsedAt: IsoDateTime | null;
  lastUsedIp: string;
  expiresAt: IsoDateTime | null;
  revokedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  /** True for a key staff made for the account; the server always sends it. */
  createdByStaff?: boolean;
};

/**
 * Body of `POST /admin/clients/:id/api-keys`: `name` 1-60 characters, `allowedIps` up to 20 addresses or ranges (empty: any
 * address), `expiresAt` an ISO time in the future, `rateLimitPerMin` an integer from 1 to 6000 (the server's default is 60).
 * The scope list is not part of it: see `createAccountApiKey`.
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
