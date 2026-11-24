// Tests for the rank change (`POST /admin/clients/:id/rank`), run against the dev mock API: the key it needs, what the server answers
// (the rank, the wallet after it, the amount moved, the sessions ended, the keys revoked), the blockers it lists together, and the
// refusals. The mock plays the server's rules; the Owner check is the server's.
import { HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { isApiError } from '@/lib/api';
import { roleOf, roleStore } from '@/mocks/roles';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { KEY_REUSED_WORDS } from '../lib/keyReuse';
import { RANK_BLOCKER_WORDS, rankBlockersOf } from '../lib/rankChangeBlockers';
import { SEED, spy } from '../test/apiSupport';
import { accountTopUps } from '../mocks/walletStore';
import { installAccountMocks } from '../test/installAccountMocks';
import {
  adjustAccountWallet,
  anonymizeAccount,
  changeAccountRank,
  freezeAccountWallet,
  getAccount,
  getAccountWallet,
  listAccountApiKeys,
  listAccountStatement,
  listAccounts,
  setAccountCreditLimit,
  updateAccount,
} from '.';

setupMockApi();
installAccountMocks();
beforeEach(async () => {
  await signInAs();
});

const { ZAIN, FORMER_PENDING, DANIEL, SOFIA } = SEED;
const WHOLESALE = 2;
const STANDARD = 1;
const RETAIL = 4;

/** The first merchant that has no order and no held amount, so a change across kinds meets no blocker. */
async function idleMerchant(): Promise<number> {
  const { data } = await listAccounts({
    filters: { rankKind: 'merchant', status: 'active' },
    sort: ['ordersCount'],
    order: ['asc'],
  });
  const found = data.find((account) => account.ordersCount === 0 && Number(account.wallet?.reserved) === 0);
  if (!found) throw new Error('The mock seed has no idle merchant.');
  return found.id;
}

describe('what the function sends', () => {
  it('posts the rank only, with the dialog’s key', async () => {
    const seen = spy('post', `/admin/clients/${ZAIN}/rank`, () => HttpResponse.json({}));
    await changeAccountRank(ZAIN, { groupId: WHOLESALE }, 'key-rank');
    expect(seen[0]).toMatchObject({
      method: 'POST',
      path: `/admin/clients/${ZAIN}/rank`,
      body: { groupId: WHOLESALE },
    });
    expect(seen[0].headers.get('Idempotency-Key')).toBe('key-rank');
  });
});

describe('within one kind', () => {
  it('moves a merchant to another merchant rank and changes nothing else', async () => {
    const result = await changeAccountRank(ZAIN, { groupId: WHOLESALE }, 'k1');
    expect(result).toMatchObject({
      rank: { id: WHOLESALE, name: 'Wholesale', kind: 'merchant' },
      movedAmount: '0.0000',
      transactionId: null,
      sessionsEnded: 0,
      apiKeysRevoked: 0,
      wallet: { kind: 'merchant', balance: '1209.7500' },
    });
    expect((await getAccount(ZAIN)).rank).toMatchObject({ id: WHOLESALE, name: 'Wholesale' });
    expect((await getAccount(ZAIN)).security?.activeSessions).toBe(1);
  });

  it('refuses a rank without credit while the credit limit is above zero, as a blocker', async () => {
    const error = await changeAccountRank(ZAIN, { groupId: STANDARD }, 'k2').catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 409, code: 'RANK_CHANGE_BLOCKED' });
    expect(rankBlockersOf(error)).toEqual([expect.stringMatching(/credit limit/i)]);
    expect((await getAccount(ZAIN)).rank.id).toBe(3);
    await setAccountCreditLimit(ZAIN, { creditLimit: '0.0000' }, 'k3');
    await expect(changeAccountRank(ZAIN, { groupId: STANDARD }, 'k4')).resolves.toMatchObject({
      rank: { id: STANDARD },
    });
  });
});

describe('across kinds', () => {
  it('moves a merchant to retail: the balance moves, sessions end, keys are revoked, the credit limit goes', async () => {
    const id = await idleMerchant();
    await setAccountCreditLimit(id, { creditLimit: '0.0000' }, 'c0');
    await adjustAccountWallet(
      id,
      { amount: '40.0000', direction: 'credit', reason: 'Opening balance' },
      'c1',
    );
    const result = await changeAccountRank(id, { groupId: RETAIL }, 'c2');
    expect(result).toMatchObject({
      rank: { id: RETAIL, kind: 'retail' },
      movedAmount: '40.0000',
      wallet: { kind: 'store', balance: '40.0000', available: '40.0000', creditLimit: '0.0000' },
    });
    expect(result.transactionId).toBeGreaterThan(0);
    const after = await getAccount(id);
    expect(after).toMatchObject({ rank: { kind: 'retail' }, wallet: { kind: 'store' } });
    expect(after.security?.activeSessions).toBe(0);
  });

  it('lets a merchant with a credit limit leave for retail: the limit is not a blocker across kinds, it goes to zero', async () => {
    const id = await idleMerchant();
    // A merchant rank that allows credit, with a limit above zero.
    const rank = (await getAccount(id)).rank.id;
    if (rank !== WHOLESALE) await changeAccountRank(id, { groupId: WHOLESALE }, 'cl0');
    await setAccountCreditLimit(id, { creditLimit: '500.0000' }, 'cl1');
    const result = await changeAccountRank(id, { groupId: RETAIL }, 'cl2');
    expect(result.rank.kind).toBe('retail');
    expect(result.wallet).toMatchObject({ kind: 'store', creditLimit: '0.0000' });
  });

  it('revokes every live API key when an account leaves the merchant kind, and counts them', async () => {
    const id = await idleMerchant();
    await setAccountCreditLimit(id, { creditLimit: '0.0000' }, 'k4b');
    const before = (await listAccountApiKeys(id)).filter((key) => !key.revokedAt).length;
    const result = await changeAccountRank(id, { groupId: RETAIL }, 'k5');
    expect(result.apiKeysRevoked).toBe(before);
    // A retail account has no keys at all.
    await expect(listAccountApiKeys(id)).rejects.toMatchObject({ status: 409 });
  });

  it('moves a shop account to a merchant rank and makes the Dhru username', async () => {
    const result = await changeAccountRank(DANIEL, { groupId: WHOLESALE }, 'k6');
    expect(result).toMatchObject({
      rank: { kind: 'merchant', name: 'Wholesale' },
      movedAmount: '50.0000',
      wallet: { kind: 'merchant', balance: '50.0000', creditLimit: '0.0000' },
      sessionsEnded: 1,
    });
    expect((await getAccount(DANIEL)).username).toBe('daniel-whitmore');
    expect((await getAccount(DANIEL)).security?.activeSessions).toBe(0);
  });

  it('refuses an account whose wallet is on hold, and writes nothing', async () => {
    await freezeAccountWallet(DANIEL, { reason: 'Checking a dispute' }, 'f1');
    const error = await changeAccountRank(DANIEL, { groupId: WHOLESALE }, 'k7').catch((e: unknown) => e);
    expect(isApiError(error) && error.code).toBe('RANK_CHANGE_BLOCKED');
    expect(rankBlockersOf(error)).toEqual([expect.stringMatching(/hold/i)]);
    expect((await getAccount(DANIEL)).rank.kind).toBe('retail');
    expect(Number((await getAccountWallet(DANIEL)).balance)).toBe(50);
  });

  it('lists every blocker together: an unpaid top-up and a hold', async () => {
    const [waiting] = (await accountTopUps()).filter((topUp) => topUp.status === 'pending');
    await freezeAccountWallet(waiting.accountId, { reason: 'Checking a dispute' }, 'f2');
    const error = await changeAccountRank(waiting.accountId, { groupId: WHOLESALE }, 'k8').catch(
      (e: unknown) => e,
    );
    expect(rankBlockersOf(error)).toEqual(
      expect.arrayContaining([RANK_BLOCKER_WORDS.open_topup, RANK_BLOCKER_WORDS.frozen]),
    );
  });

  it('refuses a guest and an order still in progress', async () => {
    const guest = await changeAccountRank(SOFIA, { groupId: WHOLESALE }, 'g1').catch((e: unknown) => e);
    expect(rankBlockersOf(guest)).toEqual([expect.stringMatching(/guest/i)]);
    const live = await changeAccountRank(ZAIN, { groupId: RETAIL }, 'g2').catch((e: unknown) => e);
    expect(isApiError(live) && live.code).toBe('RANK_CHANGE_BLOCKED');
    expect(rankBlockersOf(live).length).toBeGreaterThan(0);
  });
});

describe('the key and the refusals', () => {
  it('needs the key, a rank that exists and another rank than the current one', async () => {
    await expect(changeAccountRank(ZAIN, { groupId: WHOLESALE }, '')).rejects.toMatchObject({ status: 422 });
    await expect(changeAccountRank(ZAIN, { groupId: 99 }, 'r1')).rejects.toMatchObject({
      status: 422,
      fieldErrors: { groupId: ['That rank does not exist.'] },
    });
    await expect(changeAccountRank(ZAIN, { groupId: 3 }, 'r2')).rejects.toMatchObject({
      status: 422,
      fieldErrors: { groupId: ['The account is already in this rank.'] },
    });
    await expect(changeAccountRank(9999, { groupId: WHOLESALE }, 'r3')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('answers a repeated key with the first result and refuses the key for another rank', async () => {
    const first = await changeAccountRank(ZAIN, { groupId: WHOLESALE }, 'same');
    const again = await changeAccountRank(ZAIN, { groupId: WHOLESALE }, 'same');
    expect(again).toEqual(first);
    // The server answers 409 for a key sent again with another rank (the catalog says so), and the console words it for staff: nothing was posted
    // twice, and the person closes the window instead of trying again.
    await expect(changeAccountRank(ZAIN, { groupId: 3 }, 'same')).rejects.toMatchObject({
      status: 409,
      code: 'IDEMPOTENCY_KEY_REUSED',
      detail: KEY_REUSED_WORDS,
    });
  });

  it('is the Owner’s alone: a role without the exact * permission is refused and nothing changes', async () => {
    roleStore().patch(roleOf('owner').id, { permissions: ['clients:update', 'clients:security'] });
    await expect(changeAccountRank(ZAIN, { groupId: WHOLESALE }, 'own1')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
    expect((await getAccount(ZAIN)).rank.id).toBe(3);
  });

  it('refuses an anonymized account', async () => {
    await anonymizeAccount(SEED.MIA);
    await expect(changeAccountRank(SEED.MIA, { groupId: WHOLESALE }, 'an1')).rejects.toMatchObject({
      status: 409,
      code: 'ANONYMIZED',
    });
  });

  it('keeps the statement of a merchant wallet through a change within the kind', async () => {
    const before = (await listAccountStatement(FORMER_PENDING)).total;
    await changeAccountRank(FORMER_PENDING, { groupId: WHOLESALE }, 'st1');
    expect((await listAccountStatement(FORMER_PENDING)).total).toBe(before);
    await updateAccount(FORMER_PENDING, { internalNotes: 'Moved by the Owner' });
  });
});
