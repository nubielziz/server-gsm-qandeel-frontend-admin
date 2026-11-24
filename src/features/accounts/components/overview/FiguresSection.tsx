// FiguresSection: the money and the order figures of the Overview. The wallet and the 30-day figures are the server's and need
// `wallet:read` (without it one line says so); the all-time order count does not. A guest has no wallet and shows the order count only.
import { FormRow, Icon, SectionHeading } from '@/components/ui';
import { money, money0, num, pct } from '@/lib/format';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { AccountDetail } from '../../types';
import { availableNote, heldText, lastOrderText, marginText, ordersText } from './overviewText';
import { Value } from './Value';

export interface FiguresSectionProps {
  account: AccountDetail;
  grants: AccountGrants;
  now: number;
}

// A figure the part could not read (no wallet or no stats in the answer) is a dash.
const DASH = <span className="text-ink3">–</span>;

/** A balance below zero is in the critical colour with the alert icon: status is never colour alone. */
function Balance({ balance }: { balance: string }) {
  const negative = Number(balance) < 0;
  return negative ? (
    <span className="inline-flex items-center gap-1">
      <Icon name="alert" className="ic-sm text-crit-fg" />
      <span className="text-crit-fg">{money(balance)}</span>
    </span>
  ) : (
    <span>{money(balance)}</span>
  );
}

/** The figure rows. */
export function FiguresSection({ account, grants, now }: FiguresSectionProps) {
  const wallet = account.wallet;
  const stats = account.stats;
  const merchant = account.rank.kind === 'merchant';
  const hasLogin = account.hasAccount;
  return (
    <>
      <SectionHeading as="h3">Figures</SectionHeading>
      {hasLogin && !grants.can('wallet:read') && (
        <p className="py-2.5 text-sm text-ink3">
          You need the wallet:read permission to see the wallet and the 30-day figures
        </p>
      )}
      {hasLogin && grants.can('wallet:read') && (
        <>
          <FormRow label="Wallet">
            <Value note={wallet ? heldText(wallet.reserved) : undefined}>
              {wallet ? <Balance balance={wallet.balance} /> : DASH}
            </Value>
          </FormRow>
          <FormRow label="Available">
            <Value note={wallet && merchant ? availableNote(wallet.creditLimit) : undefined}>
              {wallet ? money(wallet.available) : DASH}
            </Value>
          </FormRow>
          <FormRow label="Spent, 30 days">
            <Value note={stats ? ordersText(stats.orders) : undefined}>
              {stats ? money0(stats.spend) : DASH}
            </Value>
          </FormRow>
          <FormRow label="Profit, 30 days">
            <Value note={stats ? marginText(stats.margin) : undefined}>
              {stats ? money0(stats.profit) : DASH}
            </Value>
          </FormRow>
          <FormRow label="Success rate">
            <Value note="completed ÷ (completed + rejected)">
              {stats?.successRate == null ? DASH : pct(stats.successRate, 0)}
            </Value>
          </FormRow>
        </>
      )}
      <FormRow label="Orders">
        <Value note={lastOrderText(account.ordersCount, account.lastOrderAt, now)}>
          {num(account.ordersCount)}
        </Value>
      </FormRow>
    </>
  );
}
