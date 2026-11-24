// Mock of the wallet routes of an account (`GET /admin/clients/:id/wallet`, `/statement`, `POST …/wallet/adjust|freeze|unfreeze`,
// `PATCH …/credit-limit`) and the official statement download: one address for both wallet kinds. The mock keeps the refusals the dialogs
// must show (an amount over the approval limit, a debit past the credit limit or below zero, a guest with nothing to credit, a hold that
// cannot be lifted) and honours the Idempotency-Key every write needs. Real rules are the server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { money } from '@/lib/format';
import { problem } from '@/mocks/problem';
import { currentStaff } from '@/mocks/session';
import { context, walletKindOf, type Context } from './context';
import { toWallet } from './dto';
import { bodyOf, idOf, invalid, notFound, route, textOf, type Call } from './shared';
import type { MockAccount } from './types';
import {
  ensureSeedJournals,
  fromUnits,
  patchWallet,
  postToWallet,
  toUnits,
  walletOfState,
} from './walletStore';

type Target = { ctx: Context; account: MockAccount; key: string };

// A wallet route needs an account, and for a write the key; this finds them or answers instead.
async function target(call: Call, options: { write: boolean }): Promise<Target | Response> {
  const ctx = await context();
  const account = ctx.state.accounts.find(idOf(call));
  if (!account) return notFound('account', call.params.id);
  const key = call.request.headers.get('Idempotency-Key')?.trim() ?? '';
  if (options.write && !key)
    return invalid([{ field: 'idempotency-key', message: 'Send an Idempotency-Key header.' }]);
  return { ctx, account, key };
}

const anonymized = () =>
  problem(409, 'ANONYMIZED', 'Account removed', 'This account was anonymized. Nothing can change.');

const reasonProblem = (reason: string, max: number) =>
  reason.length < 5
    ? 'Add a reason of at least 5 characters.'
    : reason.length > max
      ? `Keep the reason to ${max} characters or fewer.`
      : null;

// A key used before answers the first request; the same key for another request is refused. `answer` is what the first request answered.
type Replay = { answer: unknown } | { refused: Response };

function replayOf(
  ctx: Context,
  accountId: number,
  action: string,
  key: string,
  fingerprint: string,
): Replay | undefined {
  const replay = ctx.wallets.replays.get(`${accountId}|${action}|${key}`);
  if (!replay) return undefined;
  if (replay.fingerprint !== fingerprint) {
    return {
      refused: problem(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Key already used',
        'This Idempotency-Key was already used for a different request.',
      ),
    };
  }
  return { answer: replay.answer };
}

function remember(
  ctx: Context,
  accountId: number,
  action: string,
  key: string,
  fingerprint: string,
  answer: unknown,
) {
  ctx.wallets.replays.set(`${accountId}|${action}|${key}`, { fingerprint, answer });
}

async function adjust(found: Target, body: Record<string, unknown>): Promise<Response> {
  const { ctx, account, key } = found;
  const units = toUnits(textOf(body.amount));
  const direction = body.direction === 'debit' ? 'debit' : body.direction === 'credit' ? 'credit' : null;
  const reason = textOf(body.reason);
  const reasonError = reasonProblem(reason, 140);
  const errors = [
    ...(units > 0 ? [] : [{ field: 'amount', message: 'Enter an amount greater than zero.' }]),
    ...(direction ? [] : [{ field: 'direction', message: 'Choose credit or debit.' }]),
    ...(reasonError ? [{ field: 'reason', message: reasonError }] : []),
  ];
  if (errors.length > 0) return invalid(errors);

  const fingerprint = JSON.stringify([fromUnits(units), direction, reason]);
  const replay = replayOf(ctx, account.id, 'adjust', key, fingerprint);
  if (replay && 'refused' in replay) return replay.refused;
  if (replay) {
    // The first answer's journal, with the wallet as it is now.
    const first = replay.answer as { transactionId: number };
    return HttpResponse.json({
      transactionId: first.transactionId,
      wallet: toWallet(await context(), account),
    });
  }

  if (account.status === 'anonymized') return anonymized();
  if (direction === 'credit' && !account.hasAccount) {
    return problem(
      409,
      'NO_ACCOUNT',
      'No account',
      'This is a guest, so there is no wallet to add to. Make an account first.',
    );
  }
  const kind = walletKindOf(ctx, account);
  const view = toWallet(ctx, account);
  const wallet = walletOfState(ctx.wallets, account.id);
  if (units > toUnits(view.adjustApprovalLimit)) {
    return problem(
      409,
      'APPROVAL_REQUIRED',
      'Second approver needed',
      kind === 'merchant'
        ? 'Adjustments over $10,000 need a second approver. Split it or ask Finance.'
        : `Adjustments above ${view.adjustApprovalLimit} need a second approver.`,
    );
  }
  if (direction === 'debit' && kind === 'merchant' && wallet.balance - units < -wallet.creditLimit) {
    return problem(
      409,
      'CREDIT_LIMIT_EXCEEDED',
      'Credit limit exceeded',
      `This would take the wallet below the credit limit (${money(-wallet.creditLimit / 10_000)}).`,
    );
  }
  if (direction === 'debit' && kind === 'store' && units > wallet.balance) {
    return problem(
      402,
      'INSUFFICIENT_FUNDS',
      'Not enough balance',
      'A debit cannot take the balance below zero.',
    );
  }
  const staff = await currentStaff();
  const transactionId = await postToWallet({
    account,
    kind,
    journalKind: 'adjustment',
    memo: `Manual ${direction}: ${reason}`,
    units: direction === 'credit' ? units : -units,
    by: staff?.name ?? 'Staff',
    otherKind: 'adjustments',
  });
  remember(ctx, account.id, 'adjust', key, fingerprint, { transactionId });
  return HttpResponse.json({ transactionId, wallet: toWallet(await context(), account) });
}

// Freeze and unfreeze share their checks: a reason, a key, and the wallet answered afterwards.
async function hold(found: Target, body: Record<string, unknown>, freeze: boolean): Promise<Response> {
  const { ctx, account, key } = found;
  const reason = textOf(body.reason);
  const bad = reasonProblem(reason, 200);
  if (bad) return invalid([{ field: 'reason', message: bad }]);
  const action = freeze ? 'freeze' : 'unfreeze';
  const replay = replayOf(ctx, account.id, action, key, reason);
  if (replay && 'refused' in replay) return replay.refused;
  if (replay) return HttpResponse.json(toWallet(await context(), account));
  if (account.status === 'anonymized') return anonymized();
  const wallet = walletOfState(ctx.wallets, account.id);
  if (freeze) {
    // Freezing a frozen wallet changes nothing.
    if (!wallet.hold) await patchWallet(account.id, { hold: { at: new Date().toISOString(), reason } });
  } else {
    // Only a store balance below zero stays on hold; a merchant wallet below zero is a use of credit.
    if (wallet.balance < 0 && walletKindOf(ctx, account) === 'store') {
      return problem(409, 'CONFLICT', 'Balance below zero', 'Bring the balance to zero or above first.');
    }
    await patchWallet(account.id, { hold: null });
  }
  remember(ctx, account.id, action, key, reason, {});
  return HttpResponse.json(toWallet(await context(), account));
}

export const walletRoutes: HttpHandler[] = [
  route('get', '/admin/clients/:id/wallet', async (call) => {
    const found = await target(call, { write: false });
    return found instanceof Response ? found : HttpResponse.json(toWallet(found.ctx, found.account));
  }),

  route('get', '/admin/clients/:id/statement', async (call) => {
    const found = await target(call, { write: false });
    if (found instanceof Response) return found;
    await ensureSeedJournals();
    // The mock keeps one history per account (its lines are posted to the account, not to a wallet kind), so `wallet=merchant|store` answers
    // that history for the account's live kind and nothing for the other one.
    const params = new URL(call.request.url).searchParams;
    const wanted = params.get('wallet');
    params.delete('wallet');
    const left = wanted !== null && wanted !== 'live' && wanted !== walletKindOf(found.ctx, found.account);
    const rows = left ? [] : (found.ctx.wallets.statements.get(found.account.id) ?? []);
    const { page, total } = applyListQuery([...rows], params);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  route('post', '/admin/clients/:id/wallet/adjust', async (call) => {
    const found = await target(call, { write: true });
    return found instanceof Response ? found : adjust(found, await bodyOf(call.request));
  }),

  route('post', '/admin/clients/:id/wallet/freeze', async (call) => {
    const found = await target(call, { write: true });
    return found instanceof Response ? found : hold(found, await bodyOf(call.request), true);
  }),

  route('post', '/admin/clients/:id/wallet/unfreeze', async (call) => {
    const found = await target(call, { write: true });
    return found instanceof Response ? found : hold(found, await bodyOf(call.request), false);
  }),

  // A merchant wallet only; the key makes a retry of one dialog opening change once.
  route('patch', '/admin/clients/:id/credit-limit', async (call) => {
    const found = await target(call, { write: true });
    if (found instanceof Response) return found;
    const { ctx, account, key } = found;
    if (account.status === 'anonymized') return anonymized();
    const limit = Number((await bodyOf(call.request)).creditLimit);
    if (!Number.isFinite(limit) || limit < 0) {
      return invalid([{ field: 'creditLimit', message: 'Enter an amount of zero or more.' }]);
    }
    if (walletKindOf(ctx, account) !== 'merchant') {
      return invalid([{ field: 'creditLimit', message: 'A store balance has no credit limit.' }]);
    }
    const replay = replayOf(ctx, account.id, 'credit-limit', key, String(limit));
    if (replay && 'refused' in replay) return replay.refused;
    if (replay) return HttpResponse.json(toWallet(await context(), account));
    const rank = ctx.state.ranks.find(account.rankId);
    if (limit > 0 && !rank?.overdraftAllowed) {
      return invalid([{ field: 'creditLimit', message: 'This rank allows no credit.' }]);
    }
    // A wallet on hold takes no raise of its limit (lowering one still works).
    const held = walletOfState(ctx.wallets, account.id);
    if (held.hold && toUnits(limit) > held.creditLimit) {
      return problem(
        409,
        'WALLET_FROZEN',
        'This wallet is on hold.',
        'This wallet is on hold, so its credit limit cannot be raised.',
      );
    }
    await patchWallet(account.id, { creditLimit: toUnits(limit) });
    remember(ctx, account.id, 'credit-limit', key, String(limit), {});
    return HttpResponse.json(toWallet(await context(), account));
  }),

  // The real server answers with the official statement file; the mock sends a small stand-in with a file name. A store balance has none.
  route('get', '/admin/reports/client-statement/:clientId', async (call) => {
    const ctx = await context();
    const id = idOf(call, 'clientId');
    const account = ctx.state.accounts.find(id);
    if (!account) return notFound('account', call.params.clientId);
    if (walletKindOf(ctx, account) !== 'merchant') {
      return problem(409, 'CONFLICT', 'No statement', 'Only a merchant wallet has an official statement.');
    }
    return new HttpResponse(`Mock statement for account ${id}`, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="statement-${id}-mock.pdf"`,
      },
    });
  }),
];
