// Types of the one accounts table (`/admin/clients`): the row the list and the record read, and the bodies of the changes staff make
//. A merchant and a customer are one kind of record told apart by its rank; a guest is a row without a login.
// The map gives no bodies (MISMATCHES M10), so every shape below is an assumed contract.
import type { Decimal, Id, IsoDateTime, Money } from '@/lib/api';

/** A record named in a join. */
export type NamedRef = { id: Id; name: string };

/** Where an account stands: trading, paused by staff, stopped for fraud, or erased. */
export type AccountStatus = 'active' | 'suspended' | 'blocked' | 'anonymized';

/** The two kinds of rank. The wire says `merchant` and `retail`; anything that is not a merchant has retail rights. */
export type RankKind = 'retail' | 'merchant';

/** The rank of an account, named in a join: its discount off base prices ("8" is 8%) and whether its accounts may have credit. */
export type RankRef = {
  id: Id;
  name: string;
  kind: RankKind;
  discountPercent: Decimal;
  creditAllowed: boolean;
};

/**
 * How an account with a login signs in and what staff can still do about it (`security` of the row). Never carries a hash or a
 * secret. `linkSentAt` is when the newest open invitation or reset link was made, `verificationSentAt` the same for the newest
 * open verification link; both are null when no such link is open.
 */
export type AccountSecurity = {
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

/** Why, when and by whom an account was suspended; the whole object is null unless the status is `suspended`. */
export type AccountSuspension = { at: IsoDateTime | null; reason: string | null; by: NamedRef | null };

/** The kind of the live wallet: a merchant wallet (orders are held and settled from it) or a store balance (spent at checkout). */
export type WalletKind = 'merchant' | 'store';

/** The wallet figures a list row carries for staff who can read wallets; the server works out every figure. */
export type AccountRowWallet = {
  kind: WalletKind;
  balance: Money;
  reserved: Money;
  creditLimit: Money;
  available: Money;
  frozen: boolean;
};

/** What an account did in the last 30 days, counted by the server. `margin` and `successRate` are percents. */
export type AccountStats = {
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
 * One account, as `GET /admin/clients` and `GET /admin/clients/:id` send it. `wallet` and `stats` come only for staff who can read
 * wallets (absent otherwise: a screen shows a dash); `wallet` is absent for a guest. `security` is null for a guest. A key the
 * console no longer reads may still arrive from an older server: it is ignored.
 */
export type AccountRow = {
  id: Id;
  createdAt: IsoDateTime;
  name: string;
  email: string;
  emailVerifiedAt: IsoDateTime | null;
  phone: string;
  country: string;
  company: string;
  address: string;
  taxId: string;
  /** Staff only. */
  internalNotes: string;
  /** The Dhru login; null until the account holds a merchant rank. */
  username: string | null;
  status: AccountStatus;
  rank: RankRef;
  /** False for a guest: a record made by a checkout, with no login. */
  hasAccount: boolean;
  /** A login account with no password yet: the invitation went out and was not used. */
  invitationPending: boolean;
  currencyCode: string | null;
  marketingOptIn: boolean;
  createdBy: NamedRef | null;
  suspension: AccountSuspension | null;
  anonymizedAt: IsoDateTime | null;
  lastLoginAt: IsoDateTime | null;
  ordersCount: number;
  lastOrderAt: IsoDateTime | null;
  security: AccountSecurity | null;
  wallet?: AccountRowWallet | null;
  stats?: AccountStats | null;
};

/** The record of one account: the row plus its sign-in facts, for any rank and status. */
export type AccountDetail = AccountRow;

/** The numbers of the strip and the status menu (`GET /admin/clients/counts`): one aggregate, never cached. */
export type AccountCounts = {
  all: number;
  retail: number;
  merchant: number;
  guests: number;
  active: number;
  suspended: number;
  blocked: number;
  anonymized: number;
  invitationPending: number;
};

/** How an account gets a password: an emailed link to choose one, or a temporary one the server makes (MISMATCHES M12). */
export type PasswordMode = 'reset_link' | 'temporary_password';

/**
 * Body of `POST /admin/clients`: a retail account is made with no `groupId`, never with a company or a credit limit; a merchant
 * rank needs the Owner. `password.mode` defaults to a link. `phone` and the other optional keys are left out when empty.
 */
export type CreateAccountBody = {
  name: string;
  email: string;
  country: string;
  phone?: string;
  company?: string;
  groupId?: Id;
  creditLimit?: Money;
  password?: { mode: PasswordMode };
};

/** The new account; `temporaryPassword` is present once, only for the temporary-password mode. */
export type CreateAccountResult = AccountRow & { temporaryPassword?: string };

/**
 * The eight details staff can edit (`PATCH /admin/clients/:id`): all optional, several at once. `country` is two letters,
 * `name` 1-120 characters, `address` up to 300, `taxId` up to 40, `internalNotes` up to 2000.
 */
export type AccountDetails = {
  name?: string;
  company?: string;
  phone?: string;
  country?: string;
  email?: string;
  address?: string;
  taxId?: string;
  internalNotes?: string;
};

/** The two statuses staff can write here; `blocked` and `anonymized` have their own routes. */
export type SettableStatus = 'active' | 'suspended';

/**
 * Body of `PATCH /admin/clients/:id`: one kind of change per call, a status (suspend sends `status: 'suspended'` with a
 * `reason`, reactivate sends `status: 'active'`) or details. A rank is never sent here: it has its own route.
 */
export type UpdateAccountBody = { status?: SettableStatus; reason?: string } & AccountDetails;

/** Body of `POST /admin/clients/:id/account`: how a guest gets a password. */
export type MakeAccountBody = { mode: PasswordMode };

/** Answer of the make-an-account and password routes: the temporary password, shown once, for the temporary mode only. */
export type PasswordResult = { temporaryPassword?: string; link?: 'invite' | 'reset' };

/** The old number spaces `GET /admin/legacy-accounts/:type/:id` resolves: a merchant or a customer record of the old model. */
export type LegacyAccountType = 'client' | 'merchant' | 'customer';

/** The answer of the legacy lookup. */
export type LegacyAccount = { accountId: Id };

/** What the accounts list filters by, besides paging and sorting; an array repeats the key. */
export type AccountListFilters = {
  id?: Id;
  q?: string;
  status?: AccountStatus | AccountStatus[];
  rankId?: Id | Id[];
  rankKind?: RankKind | RankKind[];
  hasAccount?: boolean;
  invitationPending?: boolean;
  country?: string;
};
