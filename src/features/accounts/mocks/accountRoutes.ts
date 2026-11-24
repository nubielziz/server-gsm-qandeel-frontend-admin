// Mock of the account routes (`/admin/clients`, `/counts`, `/:id`, `/:id/account`, `/admin/legacy-accounts/:type/:id`): the one list of every
// account with its filters, sorts and `q`, the counts, one account, adding an account, a change of status or details, and "make an
// account" for a guest. The mock refuses what the server refuses (a duplicate email, a mix of kinds, a status that is not a
// transition, a rank sent to the details route, a bad detail), so the dialogs have a server answer to show. Business rules are the
// real server's (decision 014). The rank change is in `rankChangeRoute.ts`.
import { HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { problem, type ProblemError } from '@/mocks/problem';
import { accountIdOfLegacy } from '@/mocks/seed/accountIds';
import { toIso } from '@/mocks/seed';
import { currentStaff } from '@/mocks/session';
import { endSessions } from './links';
import { context, EMAIL, guestOwner, loginOwner, rankOf, temporaryPassword, type Context } from './context';
import { checkDetails, DETAIL_KEYS } from './details';
import { toRow } from './dto';
import { COUNTRY_CURRENCY } from './seed';
import { bodyOf, coded, idOf, invalid, notFound, route, textOf } from './shared';
import { patchWallet, toUnits } from './walletStore';
import type { MockAccount } from './types';

const SEARCH_FIELDS = ['name', 'email', 'company', 'username'];
const MIXED = 'Send one change at a time: a status or details.';

/** The shop countries the retail rank sells to. A retail account's country must be one of them (it sets the currency and VAT). */
const knownShopCountry = (code: string): boolean => Object.hasOwn(COUNTRY_CURRENCY, code);

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const anonymized = () =>
  problem(409, 'ANONYMIZED', 'Account removed', 'This account was anonymized. Nothing can change.');

// A request's query as the rows are shaped: the rank is a join, so `rankId` and `rankKind` read its keys, and a sort by rank or balance
// reads the rank's order or the wallet's balance.
function listParams(params: URLSearchParams): URLSearchParams {
  const mapped = new URLSearchParams();
  const sortKey = (field: string) =>
    field === 'rank' ? 'rankOrder' : field === 'balance' ? 'wallet.balance' : field;
  for (const [key, value] of params) {
    if (key === 'rankId') mapped.append('rank.id', value);
    else if (key === 'rankKind') mapped.append('rank.kind', value);
    else if (key === '_sort') mapped.append(key, value.split(',').map(sortKey).join(','));
    else mapped.append(key, value);
  }
  return mapped;
}

/** The counts of `GET /admin/clients/counts`, from the store (never cached on the server, so never cached here). */
function countsOf(ctx: Context) {
  const rows = ctx.state.accounts.list();
  const merchants = rows.filter((a) => rankOf(ctx, a).rankKind === 'merchant');
  return {
    all: rows.length,
    retail: rows.length - merchants.length,
    merchant: merchants.length,
    guests: rows.filter((a) => !a.hasAccount).length,
    active: rows.filter((a) => a.status === 'active').length,
    suspended: rows.filter((a) => a.status === 'suspended').length,
    blocked: rows.filter((a) => a.status === 'blocked').length,
    anonymized: rows.filter((a) => a.status === 'anonymized').length,
    invitationPending: rows.filter((a) => a.hasAccount && !a.security.hasPassword && a.status === 'active')
      .length,
  };
}

// What a password mode sets on the sign-in facts: a link is sent, or a temporary password makes the account change it at next sign-in.
function passwordFlags(mode: unknown): Partial<MockAccount['security']> | undefined {
  const now = toIso(Date.now());
  if (mode === 'temporary_password') {
    return { hasPassword: true, mustChangePassword: true, passwordChangedAt: now, linkSentAt: null };
  }
  return mode === 'reset_link' ? { linkSentAt: now } : undefined;
}

export const accountRoutes: HttpHandler[] = [
  // The static segment must answer before `:id`.
  route('get', '/admin/clients/counts', async () => HttpResponse.json(countsOf(await context()))),

  route('get', '/admin/clients', async ({ request }) => {
    const ctx = await context();
    const rows = ctx.state.accounts.list().map((account) => ({
      ...toRow(ctx, account),
      rankOrder: rankOf(ctx, account).sort * 1000 + rankOf(ctx, account).id,
    }));
    const { page, total } = applyListQuery(
      rows,
      listParams(new URL(request.url).searchParams),
      SEARCH_FIELDS,
    );
    return HttpResponse.json(
      page.map(({ rankOrder: _order, ...row }) => row),
      { headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' } },
    );
  }),

  route('get', '/admin/clients/:id', async (call) => {
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    return account ? HttpResponse.json(toRow(ctx, account)) : notFound('account', call.params.id);
  }),

  // Adding an account: retail with no rank asked for, or a merchant rank (the Owner only on the server). The account starts active,
  // and the server would email a link to choose a password, or return a temporary one once.
  route('post', '/admin/clients', async ({ request }) => {
    const ctx = await context();
    const body = await bodyOf(request);
    const name = textOf(body.name).replace(/\s+/g, ' ');
    const email = textOf(body.email).toLowerCase();
    const country = textOf(body.country).toUpperCase();
    const mode = (body.password as { mode?: unknown } | undefined)?.mode ?? 'reset_link';
    const retailRank = ctx.state.ranks.list().find((r) => r.rankKind === 'retail');
    const rank = body.groupId === undefined ? retailRank : ctx.state.ranks.find(Number(body.groupId));
    const retail = rank?.rankKind !== 'merchant';
    const errors: ProblemError[] = [
      ...(name.length < 2 ? [{ field: 'name', message: 'Enter a name.' }] : []),
      ...(EMAIL.test(email) ? [] : [{ field: 'email', message: 'Enter a valid email address.' }]),
      ...(retail
        ? knownShopCountry(country)
          ? []
          : [{ field: 'country', message: 'Choose a country.' }]
        : /^[A-Z]{2}$/.test(country)
          ? []
          : [{ field: 'country', message: 'Enter the two-letter country code.' }]),
      ...(rank ? [] : [{ field: 'groupId', message: 'That rank does not exist.' }]),
      ...(mode === 'reset_link' || mode === 'temporary_password'
        ? []
        : [{ field: 'password.mode', message: 'Choose how they get a password.' }]),
      ...(retail && textOf(body.company)
        ? [{ field: 'company', message: 'A retail account has no company.' }]
        : []),
      ...(retail && body.creditLimit !== undefined
        ? [{ field: 'creditLimit', message: 'A retail account has no credit limit.' }]
        : []),
      ...(!retail && Number(body.creditLimit ?? 0) > 0 && !rank?.overdraftAllowed
        ? [{ field: 'creditLimit', message: 'This rank allows no credit.' }]
        : []),
    ];
    if (errors.length > 0 || !rank) return invalid(errors);

    const holder = loginOwner(ctx.state, email);
    if (holder) {
      return problem(
        409,
        'EMAIL_TAKEN',
        'Email already in use',
        `${email} already belongs to ${holder.name || 'another account'}.`,
      );
    }
    // A guest holds the address: a retail account is refused (make that guest an account instead), a merchant is allowed.
    if (retail && guestOwner(ctx.state, email)) {
      return problem(409, 'EMAIL_TAKEN', 'Email already in use', `A guest bought with ${email}.`, [
        coded('email', 'guest', 'A guest bought with this email: make that guest an account instead.'),
      ]);
    }

    const temporary = mode === 'temporary_password';
    const now = new Date().toISOString();
    const staff = await currentStaff();
    const row = ctx.state.accounts.insert({
      email,
      emailVerifiedAt: null,
      name,
      phone: textOf(body.phone),
      country,
      company: retail ? '' : textOf(body.company) || name,
      address: '',
      taxId: '',
      internalNotes: '',
      username: retail ? null : slug(name),
      status: 'active',
      rankId: rank.id,
      hasAccount: true,
      createdAt: now,
      createdBy: { id: staff?.id ?? 0, name: staff?.name ?? 'Staff' },
      currencyCode: retail ? COUNTRY_CURRENCY[country] : 'USD',
      marketingOptIn: false,
      suspension: null,
      anonymizedAt: null,
      lastLoginAt: null,
      security: {
        hasPassword: temporary,
        mustChangePassword: temporary,
        passwordChangedAt: temporary ? now : null,
        twofaEnabled: false,
        lastLoginAt: null,
        lastLoginIp: null,
        activeSessions: 0,
        linkSentAt: temporary ? null : now,
        verificationSentAt: null,
      },
      legacy: null,
      checkoutIp: '203.0.113.24',
    });
    if (!retail && Number(body.creditLimit ?? 0) > 0) {
      await patchWallet(row.id, { creditLimit: toUnits(String(body.creditLimit)) });
    }
    const created = toRow(await context(), row);
    return HttpResponse.json(temporary ? { ...created, temporaryPassword: temporaryPassword() } : created, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  }),

  route('patch', '/admin/clients/:id', async (call) => {
    const ctx = await context();
    const id = idOf(call);
    const current = ctx.state.accounts.find(id);
    if (!current) return notFound('account', call.params.id);
    if (current.status === 'anonymized') return anonymized();
    const body = await bodyOf(call.request);
    // A rank has its own route; a rank sent here is refused whole.
    if (body.groupId !== undefined) {
      return invalid([
        coded('groupId', 'use_rank_route', 'Change the rank from the account page: it has its own action.'),
      ]);
    }
    const sent = Object.keys(body).filter((key) => key !== 'reason' && body[key] !== undefined);
    const kindOf = (key: string) => (key === 'status' ? 'status' : 'details');
    const kinds = [...new Set(sent.map(kindOf))];
    if (kinds.length === 0) return invalid([{ field: 'status', message: 'Send a status or details.' }]);
    if (kinds.length > 1) {
      const second = sent.find((key) => kindOf(key) !== kindOf(sent[0]));
      return invalid([{ field: second ?? 'status', message: MIXED }]);
    }

    const changes: Partial<MockAccount> = {};
    if (kinds[0] === 'status') {
      const failure = await changeStatus(current, body, changes);
      if (failure) return failure;
    } else {
      const checked = checkDetails(body);
      if ('errors' in checked) return invalid(checked.errors);
      const retail = rankOf(ctx, current).rankKind === 'retail';
      if (retail && checked.country !== undefined && !knownShopCountry(checked.country)) {
        return invalid([{ field: 'country', message: 'Choose a country.' }]);
      }
      if (checked.email && loginOwner(ctx.state, checked.email, id)) {
        return problem(
          409,
          'EMAIL_TAKEN',
          'Email already in use',
          `${checked.email} already belongs to another account.`,
        );
      }
      for (const key of DETAIL_KEYS) {
        const value = checked[key];
        if (value !== undefined && value !== current[key]) Object.assign(changes, { [key]: value });
      }
      if (retail && changes.country) changes.currencyCode = COUNTRY_CURRENCY[changes.country];
      // A new address of a login account clears verification, cancels open links and gets a new link (the invitation while there is no password).
      if (changes.email && current.hasAccount) {
        changes.emailVerifiedAt = null;
        const at = toIso(Date.now());
        changes.security = {
          ...current.security,
          linkSentAt: current.security.hasPassword ? null : at,
          verificationSentAt: current.security.hasPassword ? at : null,
        };
      }
    }
    const row = ctx.state.accounts.patch(id, changes);
    return row ? HttpResponse.json(toRow(await context(), row)) : notFound('account', id);
  }),

  // A guest gets a login on the retail rank; their orders stay on it.
  route('post', '/admin/clients/:id/account', async (call) => {
    const ctx = await context();
    const account = ctx.state.accounts.find(idOf(call));
    if (!account) return notFound('account', call.params.id);
    if (account.status === 'anonymized') return anonymized();
    if (account.hasAccount) {
      return problem(409, 'ACCOUNT_EXISTS', 'Already has an account', 'This account already has a login.');
    }
    const flags = passwordFlags((await bodyOf(call.request)).mode);
    if (!flags) return invalid([{ field: 'mode', message: 'Choose how they get a password.' }]);
    if (loginOwner(ctx.state, account.email.toLowerCase())) {
      return problem(
        409,
        'EMAIL_TAKEN',
        'Email already in use',
        'Another account with a login uses this email.',
        [coded('email', 'login_exists', 'Another account with a login uses this email.')],
      );
    }
    const temporary = flags.mustChangePassword === true;
    ctx.state.accounts.patch(account.id, { hasAccount: true, security: { ...account.security, ...flags } });
    return HttpResponse.json(temporary ? { temporaryPassword: temporaryPassword() } : {}, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }),

  // The console asks which account an old record became, and never guesses.
  route('get', '/admin/legacy-accounts/:type/:id', async (call) => {
    const type = String(call.params.type);
    const old = idOf(call);
    if (type !== 'client' && type !== 'merchant' && type !== 'customer')
      return notFound('record', `${type}/${old}`);
    const { state } = await context();
    const account = state.accounts.find(accountIdOfLegacy(type, old));
    const same =
      account?.legacy &&
      (type === 'customer' ? account.legacy.type === 'customer' : account.legacy.type === 'merchant');
    return same && account
      ? HttpResponse.json({ accountId: account.id })
      : notFound('record', `${type}/${old}`);
  }),
];

/**
 * The status rules of the server: `active` from `suspended`; `suspended` from `active` with a reason of 3 to 140 characters;
 * `blocked`, `anonymized` and the retired `pending` are refused (they have their own routes); anything else is a 409. A suspension
 * ends the account's sessions and cancels open links.
 */
async function changeStatus(
  current: MockAccount,
  body: Record<string, unknown>,
  changes: Partial<MockAccount>,
): Promise<Response | undefined> {
  const wanted = body.status;
  if (wanted !== 'active' && wanted !== 'suspended') {
    return invalid([{ field: 'status', message: 'Use the block and anonymize actions for those statuses.' }]);
  }
  const refuse = () =>
    problem(409, 'INVALID_TRANSITION', 'Not allowed', `A ${current.status} account cannot become ${wanted}.`);
  if (wanted === 'active') {
    if (current.status !== 'suspended') return refuse();
    changes.status = 'active';
    changes.suspension = null;
    return undefined;
  }
  if (current.status !== 'active') return refuse();
  const reason = textOf(body.reason);
  if (reason.length < 3 || reason.length > 140) {
    return invalid([{ field: 'reason', message: 'Use 3 to 140 characters.' }]);
  }
  const staff = await currentStaff();
  changes.status = 'suspended';
  changes.suspension = {
    at: toIso(Date.now()),
    reason,
    by: { id: staff?.id ?? 0, name: staff?.name ?? 'Staff' },
  };
  changes.security = { ...current.security, linkSentAt: null, verificationSentAt: null, activeSessions: 0 };
  await endSessions(current.id);
  return undefined;
}
