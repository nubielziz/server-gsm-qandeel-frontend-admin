// Mock of the merchant account routes (`/admin/clients`, `/admin/clients/:id`): the list with its status, group and `q` filters,
// one merchant, an invitation and a change of status, group or details. The mock refuses what the server refuses (an unknown
// group, a duplicate email, a mix of kinds, a status that is not a transition, a bad detail), so the dialogs have a server answer
// to show. Business rules are the real server's (decision 014).
import { HttpResponse, type HttpHandler } from 'msw';
import { problem } from '@/mocks/problem';
import { toIso } from '@/mocks/seed';
import { currentStaff } from '@/mocks/session';
import { sessionStore } from '@/mocks/sessions';
import type { ClientStatus } from '../types';
import { toClient } from './dto';
import { checkDetails, DETAIL_KEYS } from './details';
import { bodyOf, idOf, invalid, listResponse, notFound, route, textOf } from './shared';
import { merchantStore, type MerchantStore, type MockClient } from './store';

const SEARCH_FIELDS = ['name', 'email', 'company', 'country', 'username'];
const MIXED = 'Send one change at a time: a status, a group or details.';

/** Open merchant sessions by merchant id: the Security tab's count and the sessions list read the same mock rows. */
async function openSessions(): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  for (const session of (await sessionStore()).list()) {
    if (session.subjectType === 'client')
      counts.set(session.subject.id, (counts.get(session.subject.id) ?? 0) + 1);
  }
  return counts;
}

/** One merchant the way the API sends it, with the live session count. */
export async function clientDto(row: MockClient, store: MerchantStore) {
  return toClient(row, store, (await openSessions()).get(row.id) ?? 0);
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const clientRoutes: HttpHandler[] = [
  route('get', '/admin/clients', async ({ request }) => {
    const store = await merchantStore();
    const counts = await openSessions();
    return listResponse(
      store.clients.list().map((row) => toClient(row, store, counts.get(row.id) ?? 0)),
      request,
      SEARCH_FIELDS,
    );
  }),

  route('get', '/admin/clients/:id', async (call) => {
    const store = await merchantStore();
    const row = store.clients.find(idOf(call));
    return row ? HttpResponse.json(await clientDto(row, store)) : notFound('merchant', call.params.id);
  }),

  // An invitation: the account starts pending and the server would email the sign-up link.
  route('post', '/admin/clients', async ({ request }) => {
    const store = await merchantStore();
    const body = await bodyOf(request);
    const name = textOf(body.name);
    const email = textOf(body.email).toLowerCase();
    const country = textOf(body.country).toUpperCase();
    const errors = [
      ...(name ? [] : [{ field: 'name', message: 'Enter the business name.' }]),
      ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
        ? []
        : [{ field: 'email', message: 'Enter a valid email address.' }]),
      ...(/^[A-Z]{2}$/.test(country)
        ? []
        : [{ field: 'country', message: 'Enter the two-letter country code.' }]),
    ];
    if (errors.length > 0) return invalid(errors);
    if (store.clients.list().some((client) => client.email.toLowerCase() === email)) {
      return problem(
        409,
        'EMAIL_TAKEN',
        'Email already registered',
        `A merchant with ${email} already exists.`,
      );
    }
    const groupId =
      typeof body.groupId === 'number'
        ? body.groupId
        : (store.groups.list().find((g) => g.isDefault)?.id ?? 1);
    const row: MockClient = store.clients.insert({
      username: slug(name),
      email,
      name,
      company: name,
      phone: '',
      country,
      groupId,
      status: 'pending',
      kycStatus: 'none',
      referredById: null,
      referralCode: `GSM${Date.now().toString(36).toUpperCase()}`,
      emailVerifiedAt: null,
      createdAt: toIso(Date.now()),
      locale: 'en',
      address: '',
      taxId: '',
      internalNotes: '',
      telegramLinked: false,
      security: {
        hasPassword: false,
        mustChangePassword: false,
        passwordChangedAt: null,
        twofaEnabled: false,
        lastLoginAt: null,
        lastLoginIp: null,
        activeSessions: 0,
        linkSentAt: toIso(Date.now()),
        verificationSentAt: null,
      },
      suspension: null,
      balance: 0,
      reserved: 0,
      creditLimit: Number(body.creditLimit ?? 0) || 0,
      stats: {
        orders: 0,
        spend: '0.0000',
        profit: '0.0000',
        margin: null,
        successRate: null,
        lastOrderAt: null,
      },
    });
    return HttpResponse.json(await clientDto(row, store), { status: 201 });
  }),

  route('patch', '/admin/clients/:id', async (call) => {
    const store = await merchantStore();
    const id = idOf(call);
    const current = store.clients.find(id);
    if (!current) return notFound('merchant', call.params.id);
    const body = await bodyOf(call.request);
    const sent = Object.keys(body).filter((key) => key !== 'reason' && body[key] !== undefined);
    // One kind of change per call: a status, a group or details. A mix is a 422 on the first key of the second kind.
    const kindOf = (key: string) => (key === 'status' ? 'status' : key === 'groupId' ? 'group' : 'details');
    const kinds = [...new Set(sent.map(kindOf))];
    if (kinds.length === 0)
      return invalid([{ field: 'status', message: 'Send a status, a group or details.' }]);
    if (kinds.length > 1) {
      const second = sent.find((key) => kindOf(key) !== kindOf(sent[0]));
      return invalid([{ field: second ?? 'status', message: MIXED }]);
    }

    const changes: Partial<MockClient> = {};
    if (kinds[0] === 'group') {
      const group = store.groups.find(Number(body.groupId));
      if (!group) return invalid([{ field: 'groupId', message: 'That group does not exist.' }]);
      changes.groupId = group.id;
    } else if (kinds[0] === 'status') {
      const failure = await changeStatus(current, body, changes);
      if (failure) return failure;
    } else {
      const checked = checkDetails(body);
      if ('errors' in checked) return invalid(checked.errors);
      const taken = checked.email
        ? store.clients.list().some((other) => other.id !== id && other.email.toLowerCase() === checked.email)
        : false;
      if (taken) {
        return problem(
          409,
          'EMAIL_TAKEN',
          'Email already registered',
          `A merchant with ${checked.email} already exists.`,
        );
      }
      for (const key of DETAIL_KEYS) {
        const value = checked[key];
        if (value !== undefined && value !== current[key]) Object.assign(changes, { [key]: value });
      }
      // A new address clears verification, cancels open links and gets a new link (the invitation while there is no password).
      if (changes.email) {
        changes.emailVerifiedAt = null;
        const at = toIso(Date.now());
        changes.security = {
          ...current.security,
          linkSentAt: current.security.hasPassword ? null : at,
          verificationSentAt: current.security.hasPassword ? at : null,
        };
      }
    }
    const row = store.clients.patch(id, changes);
    return row ? HttpResponse.json(await clientDto(row, store)) : notFound('merchant', id);
  }),
];

/**
 * The status rules of the server: `active` from `pending` or `suspended`, `suspended` from `active` or `pending` with a reason of
 * 3 to 140 characters; anything else is a 409. A suspension ends the merchant's sessions and cancels open links.
 */
async function changeStatus(
  current: MockClient,
  body: Record<string, unknown>,
  changes: Partial<MockClient>,
): Promise<Response | undefined> {
  const wanted = body.status;
  const refuse = () =>
    problem(
      409,
      'INVALID_TRANSITION',
      'Not allowed',
      `A ${current.status} merchant cannot become ${String(wanted)}.`,
    );
  if (wanted === 'active') {
    if (current.status === 'active') return refuse();
    changes.status = 'active';
    changes.suspension = null;
    return undefined;
  }
  if (wanted === 'suspended') {
    if (current.status === 'suspended') return refuse();
    const reason = textOf(body.reason);
    if (reason.length < 3 || reason.length > 140) {
      return invalid([{ field: 'reason', message: 'Use 3 to 140 characters.' }]);
    }
    const staff = await currentStaff();
    changes.status = 'suspended' as ClientStatus;
    changes.suspension = {
      at: toIso(Date.now()),
      reason,
      by: { id: staff?.id ?? 0, name: staff?.name ?? 'Staff' },
    };
    changes.security = { ...current.security, linkSentAt: null, verificationSentAt: null };
    const sessions = await sessionStore();
    for (const session of sessions.list()) {
      if (session.subjectType === 'client' && session.subject.id === current.id) sessions.remove(session.id);
    }
    return undefined;
  }
  return refuse();
}
