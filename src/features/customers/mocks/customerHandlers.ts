// Mock of `GET /admin/customers`, `GET /admin/customers/:id`, `POST /admin/customers` and `PATCH /admin/customers/:id`: the list with filters, sort
// and `x-total-count`, the detail, adding a customer (by link or with a temporary password) and editing one. The only refusals are bad input and an
// address another customer already uses. The action routes are in `actionHandlers.ts`. Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { applyListQuery } from '@/mocks/crud';
import { bodyOf, invalid, notFound, textOf } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { currentStaff, guard } from '@/mocks/session';
import type { ProblemError } from '@/mocks/problem';
import { context, EMAIL, emailOwner, knownCountry, temporaryPassword } from './context';
import { toCustomer, toDetail } from './dto';
import { COUNTRY_CURRENCY, currencyId } from './store';
import type { MockCustomer } from './types';

const SEARCH_FIELDS = ['name', 'email'];

// The 409 the real server gives for an address that another customer uses.
function emailTaken(other: MockCustomer, email: string): Response {
  return problem(
    409,
    'EMAIL_TAKEN',
    'Email already in use',
    `${email} already belongs to ${other.name}${other.hasAccount ? '.' : ', who bought as a guest. Open them and use “Create account” instead.'}`,
  );
}

export const customerHandlers: HttpHandler[] = [
  http.get('*/admin/customers', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const { state, ordersOf } = await context();
    const rows = state.customers.list().map((row) => toCustomer(row, ordersOf(row.id)));
    const { page, total } = applyListQuery(rows, new URL(request.url).searchParams, SEARCH_FIELDS);
    return HttpResponse.json(page, {
      headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
    });
  }),

  http.get('*/admin/customers/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const { state, ordersOf } = await context();
    const row = state.customers.find(String(params.id));
    return row ? HttpResponse.json(toDetail(row, ordersOf(row.id), state)) : notFound('customer', params.id);
  }),

  // Add a customer with an account: a link to choose a password, or a temporary password the server makes up.
  http.post('*/admin/customers', async ({ request }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const { state } = await context();
    const body = await bodyOf(request);
    const name = textOf(body.name).replace(/\s+/g, ' ');
    const email = textOf(body.email).toLowerCase();
    const country = textOf(body.country);
    const mode = (body.password as { mode?: unknown } | undefined)?.mode;
    const errors: ProblemError[] = [
      ...(name.length < 2 ? [{ field: 'name', message: 'Enter the customer’s name.' }] : []),
      ...(EMAIL.test(email) ? [] : [{ field: 'email', message: 'Enter a valid email address.' }]),
      ...(knownCountry(country) ? [] : [{ field: 'country', message: 'Choose a country.' }]),
      ...(mode === 'reset_link' || mode === 'temporary_password'
        ? []
        : [{ field: 'password.mode', message: 'Choose how they get a password.' }]),
    ];
    if (errors.length > 0) return invalid(errors);
    const other = emailOwner(state, email);
    if (other) return emailTaken(other, email);

    const temporary = mode === 'temporary_password';
    const now = new Date().toISOString();
    const row = state.customers.insert({
      email,
      emailVerifiedAt: null,
      name,
      phone: textOf(body.phone),
      country,
      locale: textOf(body.locale) || 'en',
      currency: currencyId(COUNTRY_CURRENCY[country]),
      currencyCode: COUNTRY_CURRENCY[country],
      hasAccount: true,
      createdBy: (await currentStaff())?.id ?? null,
      marketingOptIn: false,
      riskLevel: 'low',
      status: 'active',
      suspendedAt: null,
      suspendedReason: null,
      suspendedBy: null,
      internalNotes: '',
      lastLoginAt: null,
      anonymizedAt: null,
      createdAt: now,
      mustChangePassword: temporary,
      passwordChangedAt: temporary ? now : null,
      resetSentAt: temporary ? null : now,
      activeSessions: 0,
      lastIp: null,
      checkoutIp: '203.0.113.24',
    });
    const created = toCustomer(row, []);
    return HttpResponse.json(temporary ? { ...created, temporaryPassword: temporaryPassword() } : created, {
      status: 201,
    });
  }),

  http.patch('*/admin/customers/:id', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const { state, ordersOf } = await context();
    const row = state.customers.find(String(params.id));
    if (!row) return notFound('customer', params.id);
    if (row.status === 'anonymized') {
      return problem(409, 'ANONYMIZED', 'Customer removed', 'An anonymised customer cannot be edited.');
    }
    const body = await bodyOf(request);
    const changes: Partial<MockCustomer> = {};
    const errors: ProblemError[] = [];
    if (body.name !== undefined) {
      const name = textOf(body.name).replace(/\s+/g, ' ');
      if (name.length < 2) errors.push({ field: 'name', message: 'Enter the customer’s name.' });
      else changes.name = name;
    }
    if (body.email !== undefined) {
      const email = textOf(body.email).toLowerCase();
      if (!EMAIL.test(email)) errors.push({ field: 'email', message: 'Enter a valid email address.' });
      else {
        const other = emailOwner(state, email, row.id);
        if (other) return emailTaken(other, email);
        changes.email = email;
        // A new address has to be confirmed again before it counts as verified.
        if (row.hasAccount && email !== row.email.toLowerCase()) changes.emailVerifiedAt = null;
      }
    }
    if (body.country !== undefined) {
      const country = textOf(body.country);
      if (!knownCountry(country)) errors.push({ field: 'country', message: 'Choose a country.' });
      else
        Object.assign(changes, {
          country,
          currency: currencyId(COUNTRY_CURRENCY[country]),
          currencyCode: COUNTRY_CURRENCY[country],
        });
    }
    if (body.locale !== undefined) changes.locale = textOf(body.locale);
    if (body.phone !== undefined) changes.phone = textOf(body.phone);
    if (body.internalNotes !== undefined) changes.internalNotes = textOf(body.internalNotes);
    if (errors.length > 0) return invalid(errors);
    state.customers.patch(row.id, changes);
    return HttpResponse.json(toCustomer(row, ordersOf(row.id)));
  }),
];
