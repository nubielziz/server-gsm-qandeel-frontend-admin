// Types of the privacy side of an account (`GET /admin/clients/:id/privacy`, `POST /admin/clients/:id/block`) and of the data
// requests (`/admin/data-requests`). The map gives no bodies (MISMATCHES M10), so every shape is an assumed contract.
import type { Id, IsoDateTime } from '@/lib/api';

/**
 * One line of the consent evidence: what was agreed (`purpose`), the legal document with its version when there is one
 * (for example `Terms of service v3.2`), when, and from which address.
 */
export type ConsentRecord = { purpose: string; document: string | null; at: IsoDateTime; ip: string };

/** The consent records stored with the account's latest shop order. */
export type LatestConsents = { orderId: Id; records: ConsentRecord[] };

/** One risk signal seen on an order, with the order it was seen on. */
export type RiskSignal = { text: string; orderId: Id };

/** The risk side of an account: the highest score on any order (null without orders) and the signals behind it. */
export type AccountRisk = { highestScore: number | null; signals: RiskSignal[] };

/** The answer of `GET /admin/clients/:id/privacy`: the marketing choice, the consent evidence and the risk summary. */
export type AccountPrivacy = {
  marketingOptIn: boolean;
  latestConsents: LatestConsents | null;
  risk: AccountRisk;
};

/** Body of `POST /admin/clients/:id/block`: block with a reason, or lift the block. */
export type BlockAccountBody = { blocked: true; reason: string } | { blocked: false };

/** What the person asked for: a copy of their data (`export`) or the removal of it (`erasure`). */
export type DataRequestKind = 'export' | 'erasure';

/** Where a request is: waiting, being worked on, fulfilled or refused. */
export type DataRequestStatus = 'open' | 'in_progress' | 'completed' | 'rejected';

/**
 * One data-subject request, as `GET /admin/data-requests` sends it: the account it is about (`accountId`) with its name joined
 * (`accountName`), the legal deadline (`dueAt`) and who handled it.
 */
export type DataRequest = {
  id: Id;
  accountId: Id;
  accountName: string;
  kind: DataRequestKind;
  status: DataRequestStatus;
  requestedAt: IsoDateTime | null;
  dueAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  handledBy: Id | null;
  fileId: Id | null;
  createdAt: IsoDateTime;
};

/** Body of `PATCH /admin/data-requests/:id`: the new status and an optional note for the audit log. */
export type UpdateDataRequestBody = { status: Exclude<DataRequestStatus, 'open'>; note?: string };

/** What the data-requests list filters by: a status (an array repeats the key), a kind and one account. */
export type DataRequestFilters = {
  status?: DataRequestStatus | DataRequestStatus[];
  kind?: DataRequestKind;
  accountId?: Id;
};
