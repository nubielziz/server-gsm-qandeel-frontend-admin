// Types for verification (KYC) requests (`/admin/kyc-submissions`) and a merchant's API keys (`/admin/clients/:id/api-keys`).
// The map gives no bodies (MISMATCHES M10), so every shape below is an assumed contract built from the generated rows.
import type { Id } from '@/lib/api';
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

/** One API key of a merchant, without its secret: only the prefix is ever readable (the generated row, as it is). */
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
>;
