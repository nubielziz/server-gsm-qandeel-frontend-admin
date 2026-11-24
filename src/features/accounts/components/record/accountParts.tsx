// The parts of one account's record, in the order of the left menu, and who sees each. Each part lives in its own area
// folder: the record draws whatever this list holds, narrowed to what the role may read and what the account allows (a merchant rank, a
// login, a state). So a merchant shows up to thirteen parts, a retail login eleven and a guest seven.
import { ActivityPart } from '../audit';
import { ApiPart } from '../apikeys';
import { InvoicesPart, PaymentsPart } from '../billing';
import { OrdersPart } from '../orders';
import { OverviewPart } from '../overview';
import { PricesPart } from '../prices';
import { PrivacyPart } from '../privacy';
import { ProfilePart } from '../profile';
import { SecurityPart } from '../security';
import { SupportPart } from '../support';
import type { AccountDetail } from '../../types';
import { FinancialPart, StatementPart } from '../wallet';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { AccountPartSpec } from '../types';

// What an account is, for the rules below. A rank kind is read fail-closed: only an explicit merchant rank is a merchant.
const isMerchant = (account: AccountDetail) => account.rank.kind === 'merchant';
const hasLogin = (account: AccountDetail) => account.hasAccount;
// An anonymized account keeps its orders, payments and activity for accounting, and nothing else.
const live = (account: AccountDetail) => account.status !== 'anonymized';

// Payments are wallet top-ups only (the server lists nothing else), and a guest has no wallet to top up, so a live guest has no Payments part. An
// anonymized account no longer has a login either (the server clears it), yet keeps the payments it made for accounting, so it still shows them.
const hasPayments = (account: AccountDetail) => hasLogin(account) || !live(account);

/**
 * The thirteen parts. The permission of each is the one its first read needs; the server still checks every call. A guest has no
 * login, so no wallet, payments (top-ups), API keys, sign-in details, prices or statement; a guest does have invoices, the receipts of
 * their card orders.
 */
export const ACCOUNT_PART_SPECS: readonly AccountPartSpec[] = [
  { id: 'overview', label: 'Overview', show: (g) => g.can('clients:read'), Component: OverviewPart },
  {
    id: 'wallet',
    label: 'Financial',
    show: (g, a) => g.can('wallet:read') && hasLogin(a) && live(a),
    Component: FinancialPart,
  },
  {
    id: 'profile',
    label: 'Profile',
    show: (g, a) => g.can('clients:read') && live(a),
    Component: ProfilePart,
  },
  {
    id: 'invoices',
    label: 'Invoices',
    show: (g) => g.can('invoices:read'),
    Component: InvoicesPart,
  },
  {
    id: 'payments',
    label: 'Payments',
    show: (g, a) => g.can('payments:read') && hasPayments(a),
    Component: PaymentsPart,
  },
  {
    id: 'api',
    label: 'API',
    show: (g, a) => g.can('api_keys:read') && isMerchant(a) && hasLogin(a) && live(a),
    Component: ApiPart,
  },
  {
    id: 'security',
    label: 'Security',
    show: (g, a) => g.can('clients:read') && hasLogin(a) && live(a),
    Component: SecurityPart,
  },
  {
    id: 'prices',
    label: 'Prices',
    show: (g, a) => g.can('pricing:read') && isMerchant(a) && hasLogin(a) && live(a),
    Component: PricesPart,
  },
  {
    id: 'orders',
    label: 'Orders',
    show: (g) => g.can('orders:read'),
    count: (account) => account.ordersCount,
    Component: OrdersPart,
  },
  { id: 'support', label: 'Support', show: (g) => g.can('support:read'), Component: SupportPart },
  {
    id: 'statement',
    label: 'Statement',
    show: (g, a) => g.can('wallet:read') && hasLogin(a),
    Component: StatementPart,
  },
  { id: 'privacy', label: 'Privacy and risk', show: (g) => g.can('clients:read'), Component: PrivacyPart },
  { id: 'audit', label: 'Activity Log', show: (g) => g.can('audit:read'), Component: ActivityPart },
];

/** The parts this staff member may see on this account, in the menu's order. Pass another list to draw it instead. */
export function visibleParts(
  grants: AccountGrants,
  account: AccountDetail,
  specs: readonly AccountPartSpec[] = ACCOUNT_PART_SPECS,
): AccountPartSpec[] {
  return specs.filter((spec) => spec.show(grants, account));
}
