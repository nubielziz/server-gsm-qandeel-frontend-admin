// Mock of `POST /admin/clients/:id/rank`: the Owner moves an account to another rank (403 for anyone else). The mock needs the
// `Idempotency-Key`, replays a used key (another rank under it is 409 `IDEMPOTENCY_KEY_REUSED`), refuses a rank that does not exist or is the
// current one, collects every blocker of a change across kinds and answers them together as 409 `RANK_CHANGE_BLOCKED` (nothing is written
// then), and otherwise moves the balance, ends the sessions, revokes the keys and sets the credit limit of a merchant wallet that is left to
// zero, the way the server says. A rank without credit refuses only inside the merchant kind (`credit_limit`). The real rules and the sums are
// the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { postLedger } from '@/mocks/ledger';
import { problem, type ProblemError } from '@/mocks/problem';
import { toMoney } from '@/mocks/seed';
import { currentStaff } from '@/mocks/session';
import { rankBlockerWords, type RankBlockerCode } from '../lib/rankChangeBlockers';
import type { RankChangeResult, WalletKind } from '../types';
import { callerIsOwner } from './caller';
import { context, rankOf, type Context } from './context';
import { toWallet } from './dto';
import { endSessions, ledgerOwnerOf } from './links';
import { bodyOf, coded, idOf, invalid, notFound, route } from './shared';
import type { MockAccount } from './types';
import { patchWallet, walletOfState } from './walletStore';

// An order is live while it is not final.
const FINAL = new Set(['completed', 'rejected', 'cancelled', 'refunded']);

/** The reasons a rank change across kinds is refused, in the order the server checks them. */
function blockersOf(ctx: Context, account: MockAccount): RankBlockerCode[] {
  const wallet = walletOfState(ctx.wallets, account.id);
  const found: RankBlockerCode[] = [];
  if (!account.hasAccount) found.push('guest');
  if (wallet.reserved !== 0) found.push('open_hold');
  if ((ctx.orders.get(account.id) ?? []).some((order) => !FINAL.has(order.status))) found.push('live_order');
  if (ctx.wallets.topUps.some((t) => t.accountId === account.id && t.status === 'pending'))
    found.push('open_topup');
  if (wallet.hold) found.push('frozen');
  if (wallet.balance < 0) found.push('negative_balance');
  return found;
}

const blocked = (codes: RankBlockerCode[]) =>
  problem(
    409,
    'RANK_CHANGE_BLOCKED',
    'The rank cannot change yet',
    'Something still needs attention before the rank can change.',
    codes.map((code): ProblemError => coded('groupId', code, rankBlockerWords(code))),
  );

// The username a merchant rank needs for the Dhru login, made from the name or the email when the account has none.
const usernameOf = (account: MockAccount): string =>
  (account.name || account.email)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Posts the journal that moves a balance from one wallet to the other. Returns its id. */
async function postTransfer(
  account: MockAccount,
  from: WalletKind,
  units: number,
  memo: string,
): Promise<number> {
  const to: WalletKind = from === 'merchant' ? 'store' : 'merchant';
  const staff = await currentStaff();
  const line = (kind: WalletKind, amount: number) => ({
    kind: kind === 'merchant' ? 'client_wallet' : 'customer_wallet',
    ...ledgerOwnerOf(account, kind),
    ownerName: account.name,
    amount,
  });
  const entry = await postLedger({
    kind: 'wallet_transfer',
    memo,
    orderId: account.id,
    by: staff?.name ?? 'Staff',
    lines: [line(from, units / 10_000), line(to, -units / 10_000)],
  });
  return entry.id;
}

export const rankChangeRoute: HttpHandler[] = [
  route('post', '/admin/clients/:id/rank', async (call) => {
    if (!(await callerIsOwner())) {
      return problem(403, 'FORBIDDEN', 'Not allowed', 'Only the Owner changes the rank of an account.');
    }
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    const key = call.request.headers.get('Idempotency-Key')?.trim() ?? '';
    if (!key) return invalid([{ field: 'idempotency-key', message: 'Send an Idempotency-Key header.' }]);
    if (account.status === 'anonymized') {
      return problem(
        409,
        'ANONYMIZED',
        'Account removed',
        'This account was anonymized. Nothing can change.',
      );
    }
    const groupId = Number((await bodyOf(call.request)).groupId);

    // A key used before answers the first change; the same key for another rank is refused.
    const replay = ctx.state.rankChanges.get(`${account.id}|${key}`);
    if (replay) {
      if (replay.groupId !== groupId) {
        return problem(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'Key already used',
          'This idempotency key was already used with a different request.',
        );
      }
      return HttpResponse.json(replay.result, { headers: { 'idempotency-replayed': 'true' } });
    }

    const target = ctx.state.ranks.find(groupId);
    const from = rankOf(ctx, account);
    if (!target) return invalid([{ field: 'groupId', message: 'That rank does not exist.' }]);
    if (target.id === from.id)
      return invalid([{ field: 'groupId', message: 'The account is already in this rank.' }]);

    const crossing = from.rankKind !== target.rankKind;
    const wallet = walletOfState(ctx.wallets, account.id);
    const reasons = crossing ? blockersOf(ctx, account) : [];
    // Inside the merchant kind a rank without credit cannot hold a credit limit. Across kinds the limit of the merchant wallet that is left
    // is set to zero below, so it never refuses.
    if (!crossing && wallet.creditLimit > 0 && !target.overdraftAllowed) reasons.push('credit_limit');
    if (reasons.length > 0) return blocked(reasons);

    const moved = crossing && wallet.balance > 0 ? wallet.balance : 0;
    let transactionId: number | null = null;
    let sessionsEnded = 0;
    let apiKeysRevoked = 0;
    if (crossing) {
      if (moved > 0) {
        const kind: WalletKind = from.rankKind === 'merchant' ? 'merchant' : 'store';
        transactionId = await postTransfer(
          account,
          kind,
          moved,
          `Rank change: ${from.name} to ${target.name}`,
        );
      }
      // Across kinds every session ends, and leaving the merchant kind revokes every live API key.
      sessionsEnded = ctx.sessions.get(account.id) ?? account.security.activeSessions;
      await endSessions(account.id);
      if (from.rankKind === 'merchant') {
        const now = new Date().toISOString();
        for (const apiKey of ctx.state.keys.list()) {
          if (apiKey.clientId === account.id && !apiKey.revokedAt) {
            ctx.state.keys.patch(apiKey.id, { revokedAt: now });
            apiKeysRevoked += 1;
          }
        }
        await patchWallet(account.id, { creditLimit: 0 });
      }
    }
    ctx.state.accounts.patch(account.id, {
      rankId: target.id,
      security: { ...account.security, activeSessions: crossing ? 0 : account.security.activeSessions },
      username: target.rankKind === 'merchant' ? (account.username ?? usernameOf(account)) : account.username,
    });

    const after = await context();
    const updated = after.state.accounts.find(account.id) ?? account;
    const result: RankChangeResult = {
      rank: { id: target.id, name: target.name, kind: target.rankKind },
      wallet: toWallet(after, updated),
      movedAmount: toMoney(moved / 10_000),
      transactionId,
      sessionsEnded,
      apiKeysRevoked,
    };
    ctx.state.rankChanges.set(`${account.id}|${key}`, { groupId, result });
    return HttpResponse.json(result);
  }),
];
