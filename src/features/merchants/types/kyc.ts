// Types for verification (KYC) requests (`/admin/kyc-submissions`) and a merchant's API keys (`/admin/clients/:id/api-keys`).
// The map gives no bodies (MISMATCHES M10), so every shape below is an assumed contract built from the generated rows.
import type { Id, IsoDateTime } from '@/lib/api';
import type { ApiKeyRow, KycSubmissionRow } from '@/lib/api/schema.gen';
import type { ClientStatus, NamedRef } from './client';

/** Where a verification request stands. */
export type KycSubmissionStatus = 'pending' | 'approved' | 'rejected';

/** A document the merchant uploaded, named in a join. The file itself is downloaded through `/admin/files/:id`. */
export type KycFile = { id: Id; filename: string; mime: string; size: number };

/**
 * One verification request (assumed contract). The merchant is joined so the list needs no second request; `files` names
 * the documents when the server joins them (`fileIds` is always there).
 */
export type KycSubmission = Pick<
  KycSubmissionRow,
  'id' | 'clientId' | 'fileIds' | 'reviewedAt' | 'note' | 'createdAt'
> & {
  status: KycSubmissionStatus;
  client: NamedRef & { email: string; country: string; status: ClientStatus };
  reviewedBy: NamedRef | null;
  files?: KycFile[];
};

/** The two answers to a verification request. */
export type KycDecision = 'approve' | 'reject';

/** Body of `POST /admin/kyc-submissions/:id/decide` (assumed contract): the decision and, for a rejection, the reason. */
export type KycDecisionBody = { decision: KycDecision; note?: string };

/** The filters `GET /admin/kyc-submissions` understands besides paging and sorting (assumed contract). */
export type KycListFilters = { status?: KycSubmissionStatus; clientId?: Id };

/** One API key of a merchant, without its secret: only the prefix is ever readable (the generated row, plus `createdByStaff`). */
export type ApiKey = Pick<
  ApiKeyRow,
  | 'id'
  | 'clientId'
  | 'name'
  | 'prefix'
  | 'scopes'
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
 * `name` 1-60 characters, `scopes` 1-20 entries, `allowedIps` up to 20 addresses or ranges (empty: any address), `expiresAt`
 * an ISO time in the future, `rateLimitPerMin` an integer from 1 to 6000 (the server's default is 60).
 */
export type CreateApiKeyBody = {
  name: string;
  scopes: string[];
  allowedIps?: string[];
  expiresAt?: IsoDateTime;
  rateLimitPerMin?: number;
};

/** The answer of `POST /admin/clients/:id/api-keys`: the new key's row and the full key, which is shown once and never again. */
export type CreatedApiKey = { key: ApiKey; secret: string };

/** Body of `PATCH /admin/api-keys/:id`: at least one of the two. An empty `allowedIps` removes the restriction. */
export type UpdateApiKeyBody = { rateLimitPerMin?: number; allowedIps?: string[] };
