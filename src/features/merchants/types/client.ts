// Types for merchants (`/admin/clients`): the merchant row the list and the detail page read, and the bodies of the changes
// staff make. The map names the routes but gives no bodies (MISMATCHES M10), so every shape below is an assumed contract,
// built from the generated `ClientRow` in `src/lib/api/schema.gen.ts` and narrowed to what the screens use.
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';
import type { ClientRow } from '@/lib/api/schema.gen';

/** A record named in a join. */
export type NamedRef = { id: Id; name: string };

/** Where a merchant account stands: waiting for approval, trading, or stopped by staff. */
export type ClientStatus = 'active' | 'pending' | 'suspended';

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
 * One merchant, as `GET /admin/clients` and `GET /admin/clients/:id` send it (assumed contract). The group and the
 * referrer come as joins so a row needs no second request. `wallet` and `stats` are extras the server may add for staff
 * who can read wallets; a screen shows a dash where they are missing.
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
 * Body of `PATCH /admin/clients/:id` (assumed contract): only what changes. Approve and reactivate send
 * `status: 'active'`, suspend sends `status: 'suspended'` with a `reason` for the audit log, and a group move sends `groupId`.
 */
export type UpdateClientBody = { status?: ClientStatus; reason?: string; groupId?: Id };

/** The filters `GET /admin/clients` understands besides paging and sorting (assumed contract). */
export type ClientListFilters = { status?: ClientStatus; groupId?: Id; q?: string };
