// Types of the ranks (`/admin/client-groups`): the discount and deposit limit of each rank, and the change of an account's rank
// (`POST /admin/clients/:id/rank`). The map gives no bodies (MISMATCHES M10), so every shape is an assumed contract.
import type { Decimal, Id, Money } from '@/lib/api';
import type { ClientGroupRow } from '@/lib/api/schema.gen';
import type { RankKind } from './account';
import type { AccountWallet } from './wallet';

/**
 * One rank. `kind` is the word the table stores (`b2c_retail` for the shop's single retail rank, anything else a merchant rank);
 * `rankKind` is the wire's reading of it and the one screens use. `accountCount` counts every account in the rank, retail too.
 */
export type Rank = Pick<
  ClientGroupRow,
  'id' | 'name' | 'discountPercent' | 'isDefault' | 'depositLimit' | 'overdraftAllowed' | 'sort' | 'createdAt'
> & {
  kind: string;
  rankKind: RankKind;
  accountCount?: number;
};

/** Body of `POST /admin/client-groups`: a new rank is a merchant rank; the retail rank never allows credit. */
export type CreateRankBody = {
  name: string;
  discountPercent: Decimal;
  depositLimit: Money;
  overdraftAllowed: boolean;
  isDefault: boolean;
};

/** Body of `PATCH /admin/client-groups/:id`: only the fields that change. */
export type UpdateRankBody = Partial<CreateRankBody>;

/** Body of `POST /admin/clients/:id/rank`: the new rank only. A credit limit is set afterwards, through its own route. */
export type ChangeRankBody = { groupId: Id };

/**
 * Answer of the rank change: the rank now held, the wallet after it, the amount moved between the two wallets (zero within one
 * kind), the journal that moved it and what the change ended or revoked. A replay of the same key answers the same result.
 */
export type RankChangeResult = {
  rank: { id: Id; name: string; kind: RankKind };
  wallet: AccountWallet | null;
  movedAmount: Money;
  transactionId: Id | null;
  sessionsEnded: number;
  apiKeysRevoked: number;
};
