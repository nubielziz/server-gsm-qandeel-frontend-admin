// The addresses the services feature's components link to outside the Product / Services page: the ranks on the Accounts page, and the
// merchant accounts list. The addresses of the page itself are built by `productsPath` (lib/productsPath.ts), the only builder of them;
// those of the Accounts page are built by the accounts feature (`ranksPath`, `accountsListPath`), never written here.
import { accountsListPath, ranksPath } from '@/features/accounts';

/** The ranks, which are managed on the Accounts page (its Ranks view). */
export const RANKS_PATH = ranksPath();

/** The accounts of a merchant rank, where a merchant's own prices are set (the Prices part of an account). */
export const MERCHANT_ACCOUNTS_PATH = accountsListPath({ chip: 'merchants' });
