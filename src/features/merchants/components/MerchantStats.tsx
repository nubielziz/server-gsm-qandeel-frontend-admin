// MerchantStats: the five figures under the page header (wallet, spendable, spend, profit, success rate). Ports the `strip` of
// pageMerchant in 42-p-merchants.js. Every number is the server's: the wallet from `GET /admin/clients/:id/wallet`, the 30-day
// figures from the merchant row. A figure the staff member cannot read, or that has not loaded, shows a dash and says why.
import { StatGrid, type StatCell } from '@/components/ui';
import { money, money0, pct, toAmount } from '@/lib/format';
import type { Client, ClientWallet } from '../types';

export interface MerchantStatsProps {
  client: Pick<Client, 'stats'>;
  wallet: ClientWallet | undefined;
  /** Why the wallet figures are missing ("Loading…", "Needs wallet:read"), shown under their dashes. */
  walletNote?: string;
}

const orders = (count: number) => `${count} ${count === 1 ? 'order' : 'orders'}`;

/** Draws the five figures from the wallet and the merchant's 30-day figures. */
export function MerchantStats({ client, wallet, walletNote }: MerchantStatsProps) {
  const stats = client.stats;
  const held = wallet && toAmount(wallet.reserved) > 0.005;
  const cells: StatCell[] = [
    {
      label: 'Wallet',
      value: wallet ? money(wallet.balance) : '–',
      sub: wallet ? (held ? `${money(wallet.reserved)} held in open orders` : 'No open holds') : walletNote,
      className: wallet && toAmount(wallet.balance) < 0 ? 'text-crit-fg' : undefined,
    },
    {
      label: 'Spendable',
      value: wallet ? money(wallet.available) : '–',
      sub: wallet ? `Wallet plus ${money0(wallet.creditLimit)} credit limit` : walletNote,
    },
    {
      label: 'Spend, 30 days',
      value: stats ? money0(stats.spend) : '–',
      sub: stats ? orders(stats.orders) : undefined,
    },
    {
      label: 'Profit, 30 days',
      value: stats ? money0(stats.profit) : '–',
      sub: stats ? (stats.margin == null ? 'No sales yet' : `${pct(stats.margin, 1)} margin`) : undefined,
    },
    {
      label: 'Success rate',
      value: stats?.successRate == null ? '–' : pct(stats.successRate, 0),
      sub: 'Completed ÷ (completed + rejected)',
    },
  ];
  return <StatGrid cells={cells} label="Summary" />;
}
