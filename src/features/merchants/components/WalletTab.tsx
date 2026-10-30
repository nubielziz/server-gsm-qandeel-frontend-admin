// WalletTab: the "Wallet ledger" tab of a merchant's page: the balances with the official statement download, and the statement
// with a running balance. Ports merWalletTab of 42-p-merchants.js; the server posts and sums everything.
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import type { Client } from '../types';
import { StatementTable } from './StatementTable';
import { WalletBalances } from './WalletBalances';

/** Puts the balances strip above the statement. */
export function WalletTab({
  client,
  grants,
}: {
  client: Pick<Client, 'id' | 'name'>;
  grants: MerchantGrants;
}) {
  return (
    <div>
      <WalletBalances client={client} grants={grants} />
      <StatementTable client={client} grants={grants} />
    </div>
  );
}
