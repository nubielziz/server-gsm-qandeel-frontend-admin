// WalletRows: the read-only rows of the Financial part: what kind of wallet it is, the balance, what is held, the credit limit, what can be
// spent, the unpaid top-ups, the open disputes, the hold and the second-approver rule. Every figure is the server's. A negative balance is in the
// critical colour with the alert icon; the figures of a store balance leave out what only a merchant wallet has. Both kinds show their open
// disputes: a dispute of a top-up puts either wallet on hold and keeps the hold from being lifted.
import type { ReactNode } from 'react';
import { ButtonLink, FormRow, Icon, ReadValue, cx } from '@/components/ui';
import { money } from '@/lib/format';
import type { AccountWallet } from '../../types';
import { approverText, holdText, isNegative, kindText } from './walletText';

/** The small italic words after a figure ("held in open orders"). */
function Note({ children }: { children: ReactNode }) {
  return <span className="ms-2 text-xs italic text-ink3">{children}</span>;
}

/**
 * The rows. A merchant wallet adds Reserved and Credit limit; both kinds show Open disputes (critical above zero). When the shop switched the
 * store balance off, a note says people cannot top up or pay from it, with a link to the settings.
 *
 * @param props.wallet the wallet as the server last sent it.
 */
export function WalletRows({ wallet }: { wallet: AccountWallet }) {
  const merchant = wallet.kind === 'merchant';
  const negative = isNegative(wallet.balance);
  const waiting = wallet.pendingTopUps;
  return (
    <>
      <FormRow label="Kind">
        <ReadValue>{kindText(wallet.kind)}</ReadValue>
      </FormRow>
      <FormRow label="Balance">
        <ReadValue className={cx('tabular-nums', negative && 'font-medium text-crit-fg')}>
          {negative && <Icon name="alert" className="ic-xs me-1" />}
          {money(wallet.balance)}
        </ReadValue>
      </FormRow>
      {merchant && (
        <FormRow label="Reserved">
          <ReadValue className="tabular-nums">
            {money(wallet.reserved)}
            <Note>held in open orders</Note>
          </ReadValue>
        </FormRow>
      )}
      {merchant && (
        <FormRow label="Credit limit">
          <ReadValue className="tabular-nums">{money(wallet.creditLimit)}</ReadValue>
        </FormRow>
      )}
      <FormRow label="Available">
        <ReadValue className="tabular-nums">{money(wallet.available)}</ReadValue>
      </FormRow>
      <FormRow label="Unpaid top-ups">
        <ReadValue className="tabular-nums">
          {waiting.count}
          {waiting.count > 0 && <Note>would add {money(waiting.amount)}</Note>}
        </ReadValue>
      </FormRow>
      <FormRow label="Open disputes">
        <ReadValue className={cx('tabular-nums', wallet.openDisputes > 0 && 'font-medium text-crit-fg')}>
          {wallet.openDisputes}
        </ReadValue>
      </FormRow>
      <FormRow label="Hold">
        {wallet.frozen ? (
          <ReadValue className="font-medium text-crit-fg">{holdText(wallet.frozen)}</ReadValue>
        ) : (
          <ReadValue muted>None</ReadValue>
        )}
      </FormRow>
      <FormRow label="Second approver">
        <ReadValue>{approverText(wallet.adjustApprovalLimit)}</ReadValue>
      </FormRow>
      {!merchant && !wallet.enabled && (
        <FormRow label={null}>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink2" role="note">
            <Icon name="info" className="ic-sm flex-none" />
            <span>
              The store balance is switched off. People cannot top up or pay from it, but a balance still
              shows.
            </span>
            <ButtonLink size="sm" to="/settings?tab=system">
              Open settings
            </ButtonLink>
          </p>
        </FormRow>
      )}
    </>
  );
}
