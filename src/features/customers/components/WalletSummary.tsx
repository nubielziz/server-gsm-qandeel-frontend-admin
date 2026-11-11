// WalletSummary: the top of the Wallet tab: the four figures (balance, available, unpaid top-ups, open disputes), the hold with its
// reason and date, a note when the shop has switched the balance off, and the buttons that change it. The server works out every
// figure; this only shows them. New in feature 21 (a merchant has a similar strip, `WalletBalances`).
import { Badge, Button, ButtonLink, Icon, Skeleton } from '@/components/ui';
import { fmtDate, money, toAmount } from '@/lib/format';
import type { CustomerGrants } from '../hooks/useCustomerGrants';
import type { CustomerWallet } from '../types';

export interface WalletSummaryProps {
  wallet: CustomerWallet | undefined;
  loading: boolean;
  /** The failed read, or undefined. */
  failed: boolean;
  onRetry: () => void;
  grants: CustomerGrants;
  onAdjust: () => void;
  onFreeze: () => void;
  onUnfreeze: () => void;
}

/** One labelled figure. */
function Figure({ label, value, sub, bad }: { label: string; value: string; sub?: string; bad?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink3">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${bad ? 'text-crit-fg' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-ink3">{sub}</p>}
    </div>
  );
}

/** Shows the figures, the hold, the switched-off note and the Adjust / hold buttons. */
export function WalletSummary({
  wallet,
  loading,
  failed,
  onRetry,
  grants,
  onAdjust,
  onFreeze,
  onUnfreeze,
}: WalletSummaryProps) {
  const lock = grants.needs('wallet:adjust');
  const frozen = wallet?.frozen ?? null;
  const negative = wallet !== undefined && toAmount(wallet.balance) < 0;

  return (
    <div className="space-y-3 border-b border-line p-3.5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        {loading && <Skeleton width={288} height={48} />}
        {wallet && (
          <>
            <Figure label="Balance" value={money(wallet.balance)} bad={negative} />
            <Figure label="Available" value={money(wallet.available)} />
            <Figure
              label="Unpaid top-ups"
              value={String(wallet.pendingTopUps.count)}
              sub={
                wallet.pendingTopUps.count > 0 ? `would add ${money(wallet.pendingTopUps.amount)}` : undefined
              }
            />
            <Figure label="Open disputes" value={String(wallet.openDisputes)} bad={wallet.openDisputes > 0} />
          </>
        )}
        {failed && (
          <p className="text-sm text-crit-fg" role="alert">
            Could not load the balance.{' '}
            <button type="button" className="link" onClick={onRetry}>
              Retry
            </button>
          </p>
        )}
        <span className="flex-1" />
        <Button disabled={lock.disabled || !wallet} title={lock.title} onClick={onAdjust}>
          <Icon name="wallet" className="ic-sm" />
          Adjust balance
        </Button>
        {frozen ? (
          <Button disabled={lock.disabled} title={lock.title} onClick={onUnfreeze}>
            Lift hold…
          </Button>
        ) : (
          <Button disabled={lock.disabled || !wallet} title={lock.title} onClick={onFreeze}>
            Put on hold…
          </Button>
        )}
      </div>
      {frozen && (
        <p
          className="flex flex-wrap items-center gap-2 rounded-md bg-crit-bg p-2.5 text-sm text-crit-fg"
          role="status"
        >
          <Badge tone="crit" icon="lock">
            On hold
          </Badge>
          <span>
            {frozen.reason} · since {fmtDate(frozen.at)}. The customer cannot pay from the balance or top up
            by card.
          </span>
        </p>
      )}
      {wallet && !wallet.enabled && (
        <p
          className="flex flex-wrap items-center gap-2 rounded-md bg-sunken p-2.5 text-sm text-ink2"
          role="note"
        >
          <Icon name="info" className="ic-sm flex-none" />
          <span>
            The store balance is switched off. Customers cannot top up or pay from it, but a balance still
            shows.
          </span>
          <ButtonLink size="sm" to="/settings?tab=system">
            Open settings
          </ButtonLink>
        </p>
      )}
    </div>
  );
}
