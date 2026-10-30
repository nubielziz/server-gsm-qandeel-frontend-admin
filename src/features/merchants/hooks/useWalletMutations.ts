// The wallet actions: a manual adjustment, and the official statement download. The server posts the ledger entries and refuses
// what it must, so the dialog shows its answer; the console never works out a balance.
import { useApiMutation, DASHBOARD_KEY } from '@/lib/query';
import { money } from '@/lib/format';
import { adjustClientWallet, downloadClientStatement } from '../api';
import type { AdjustWalletBody, Client } from '../types';
import { STATEMENT_KEY, staleClient, WALLET_KEY } from './keys';

/** Posts an adjustment. The toast ports the demo's "Credited $25.00 / balance is now…". */
export function useAdjustWallet() {
  return useApiMutation({
    mutationFn: ({ client, body }: { client: Pick<Client, 'id' | 'name'>; body: AdjustWalletBody }) =>
      adjustClientWallet(client.id, body),
    invalidates: (_result, { client }) => staleClient(client.id),
    // The dashboard lists negative wallets, so it is refreshed too.
    invalidateKeys: [WALLET_KEY, STATEMENT_KEY, DASHBOARD_KEY],
    successNotification: (result, { client, body }) => ({
      message: `${body.direction === 'credit' ? 'Credited' : 'Debited'} ${money(body.amount)}`,
      // The answer is an assumed contract: without the wallet in it the toast only says the entry was posted.
      description: result?.wallet
        ? `${client.name} balance is now ${money(result.wallet.balance)}.`
        : 'The ledger entry was posted.',
    }),
    errorNotification: () => false as const,
  });
}

/** Downloads the official statement; the toast names the file. The default error toast shows a refusal. */
export function useStatementDownload() {
  return useApiMutation({
    mutationFn: (client: Pick<Client, 'id' | 'name'>) => downloadClientStatement(client.id),
    successNotification: (name, client) => ({
      message: 'Statement downloaded',
      description: `${name} for ${client.name}.`,
    }),
  });
}
