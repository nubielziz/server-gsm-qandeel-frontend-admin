// The cells of the table of the All view that hold more than text: the account's name with its second line, the rank with its discount and
// the wallet with what is held or on hold. Every figure and every word is the server's; the console only formats.
import { Link } from 'react-router';
import { Icon } from '@/components/ui';
import { money, money0, toAmount } from '@/lib/format';
import { accountPath } from '../../lib/paths';
import { percentText } from '../../lib/ranks';
import type { AccountRow } from '../../types';
import { accountLabel, accountSubLine } from '../shared/accountLabel';

const DASH = <span className="text-ink3">–</span>;

/** The account's name as a link to its record, with its number, email and country under it in small italics. */
export function AccountCell({ account }: { account: AccountRow }) {
  return (
    <>
      <Link className="link block font-medium" to={accountPath(account.id)}>
        {accountLabel(account)}
      </Link>
      <span className="cell-sub">{accountSubLine(account)}</span>
    </>
  );
}

/** The rank's name, and the discount of a merchant rank under it. */
export function RankCell({ account }: { account: AccountRow }) {
  const { rank } = account;
  const discount = rank.kind === 'merchant' && Number(rank.discountPercent) > 0;
  return (
    <>
      <span className="block">{rank.name}</span>
      {discount && <span className="cell-sub">{percentText(rank.discountPercent)} off</span>}
    </>
  );
}

/**
 * The balance, in the critical colour with an alert when it is below zero, and under it the first thing that applies: "On hold", what
 * open orders hold, the credit limit. A guest has no wallet, so a dash.
 */
export function WalletCell({ account }: { account: AccountRow }) {
  const wallet = account.wallet;
  if (!wallet) return DASH;
  const negative = toAmount(wallet.balance) < 0;
  return (
    <>
      <span className={negative ? 'font-medium text-crit-fg' : undefined}>
        {negative && <Icon name="alert" className="ic-xs me-1 inline" />}
        {money(wallet.balance)}
      </span>
      {wallet.frozen ? (
        <span className="cell-sub text-crit-fg">On hold</span>
      ) : toAmount(wallet.reserved) > 0.005 ? (
        <span className="cell-sub">{money0(wallet.reserved)} held</span>
      ) : toAmount(wallet.creditLimit) > 0 ? (
        <span className="cell-sub">credit {money0(wallet.creditLimit)}</span>
      ) : null}
    </>
  );
}
