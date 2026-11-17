// Types for merchants (`/admin/clients`): the merchant row the list and the detail page read, and the bodies of the changes
// staff make. The map names the routes but gives no bodies (MISMATCHES M10), so every shape below is an assumed contract,
// built from the generated `ClientRow` in `src/lib/api/schema.gen.ts` and narrowed to what the screens use.
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';
import type { ClientRow } from '@/lib/api/schema.gen';

/** A record named in a join. */
export type NamedRef = { id: Id; name: string };

/** Where a merchant account stands: waiting for approval, trading, or stopped by staff. */
export type ClientStatus = 'active' | 'pending' | 'suspended';

/**
 * How a merchant signs in and what staff can still do about it (backend contract `ClientRow.security`, feature 20). Never
 * carries a hash or a secret. `linkSentAt` is when the newest open invitation or reset link was made, `verificationSentAt` the
 * same for the newest open verification link; both are null when no such link is open.
 */
export type ClientSecurity = {
  hasPassword: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: IsoDateTime | null;
  twofaEnabled: boolean;
  lastLoginAt: IsoDateTime | null;
  lastLoginIp: string | null;
  activeSessions: number;
  linkSentAt: IsoDateTime | null;
  verificationSentAt: IsoDateTime | null;
};

/** Why, when and by whom a merchant was suspended (`ClientRow.suspension`); the whole object is null unless the status is `suspended`. */
export type ClientSuspension = { at: IsoDateTime | null; reason: string | null; by: NamedRef | null };

/** The state of a merchant's identity check (`clients.kyc_status`). */
export type ClientKycStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** The merchant's group, named in a join. `discountPercent` is the group's discount off base prices ("4" is 4%). */
export type ClientGroupRef = NamedRef & { discountPercent: Decimal };

/**
 * The wallet figures, all worked out by the server (the console never adds balances). `balance` is the ledger balance
 * and can go negative while the merchant uses credit, `reserved` is held for open orders, `creditLimit` is how far below
 * zero the balance may go, and `available` is what the merchant can spend now.
 */
export type ClientWallet = {
  balance: Money;
  reserved: Money;
  creditLimit: Money;
  available: Money;
};

/** What a merchant did in the last 30 days, counted by the server. `margin` and `successRate` are percents. */
export type ClientStats = {
  orders: number;
  spend: Money;
  profit: Money;
  /** Profit as a percent of spend; null when nothing was sold. */
  margin: Decimal | null;
  /** Completed orders as a percent of completed plus rejected; null when none finished. */
  successRate: number | null;
  lastOrderAt: IsoDateTime | null;
};

/**
 * One merchant, as `GET /admin/clients` and `GET /admin/clients/:id` send it. The group and the referrer come as joins so a
 * row needs no second request. `wallet` and `stats` are extras the server may add for staff who can read wallets; a screen
 * shows a dash where they are missing. The keys from `address` to `suspension` are optional in the backend schema (its recorded
 * fixtures predate them) but the server always sends them, so a screen treats a missing one as "not known".
 */
export type Client = Pick<
  ClientRow,
  | 'id'
  | 'username'
  | 'email'
  | 'name'
  | 'company'
  | 'phone'
  | 'country'
  | 'groupId'
  | 'referralCode'
  | 'emailVerifiedAt'
  | 'createdAt'
> & {
  status: ClientStatus;
  kycStatus: ClientKycStatus;
  group: ClientGroupRef | null;
  referredBy: NamedRef | null;
  wallet?: ClientWallet | null;
  stats?: ClientStats | null;
  address?: string;
  taxId?: string;
  /** Staff only; never on a `/client` route. */
  internalNotes?: string;
  /** Whether the merchant linked Telegram (never the chat id). */
  telegramLinked?: boolean;
  security?: ClientSecurity;
  suspension?: ClientSuspension | null;
};

/**
 * Body of `POST /admin/clients` (assumed contract): the invitation. The server emails a sign-up link and creates the
 * account as pending. `groupId` and `creditLimit` fall back to the server's defaults when left out.
 */
export type CreateClientBody = {
  name: string;
  email: string;
  country: string;
  groupId?: Id;
  creditLimit?: Money;
  invite: true;
};

/**
 * The nine details staff can edit (backend `PATCH /admin/clients/:id`, feature 20): all optional, several at once.
 * `country` is two letters, `name` 1-120 characters, `address` up to 300, `taxId` up to 40, `internalNotes` up to 2000.
 */
export type ClientDetails = {
  name?: string;
  company?: string;
  phone?: string;
  country?: string;
  email?: string;
  address?: string;
  taxId?: string;
  internalNotes?: string;
};

/**
 * Body of `PATCH /admin/clients/:id`: one kind of change per call. A status (approve and reactivate send `status: 'active'`;
 * suspend and decline send `status: 'suspended'` with a `reason`), or a group move (`groupId`), or details (any of
 * `ClientDetails`). Mixing kinds is a 422 on the first key of the second kind.
 */
export type UpdateClientBody = { status?: ClientStatus; reason?: string; groupId?: Id } & ClientDetails;

/** The filters `GET /admin/clients` understands besides paging and sorting (assumed contract). */
export type ClientListFilters = { status?: ClientStatus; groupId?: Id; q?: string };
