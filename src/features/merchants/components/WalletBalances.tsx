// WalletBalances: the strip at the top of the Wallet ledger tab: balance, reserved, available and credit limit, as the server
// reports them, and the button that downloads the official statement. The demo had no such strip; the map adds the route.
import { Button, Icon } from '@/components/ui';
import { money } from '@/lib/format';
import { useClientWallet } from '../hooks/useClientWallet';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { useStatementDownload } from '../hooks/useWalletMutations';
import type { Client, ClientWallet } from '../types';

const FIGURES: readonly (readonly [label: string, key: keyof ClientWallet])[] = [
  ['Balance', 'balance'],
  ['Reserved', 'reserved'],
  ['Available', 'available'],
  ['Credit limit', 'creditLimit'],
];

/** Shows the four balances and the button that downloads the official statement. */
export function WalletBalances({
  client,
  grants,
}: {
  client: Pick<Client, 'id' | 'name'>;
  grants: MerchantGrants;
}) {
  const wallet = useClientWallet(client.id, grants.can('wallet:read'));
  const download = useStatementDownload();
  const reportLock = grants.needs('reports:read');

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-line p-3.5">
      {FIGURES.map(([label, key]) => (
        <div key={key}>
          <p className="text-xs text-ink3">{label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {wallet.data ? money(wallet.data[key]) : '–'}
          </p>
        </div>
      ))}
      {wallet.isError && (
        <p className="text-sm text-crit-fg" role="alert">
          Could not load the balances.{' '}
          <button type="button" className="link" onClick={() => void wallet.refetch()}>
            Retry
          </button>
        </p>
      )}
      <span className="flex-1" />
      <Button
        disabled={reportLock.disabled}
        title={reportLock.title}
        loading={download.isPending}
        onClick={() => download.mutate(client)}
      >
        <Icon name="download" className="ic-sm" />
        Download official statement
      </Button>
    </div>
  );
}
