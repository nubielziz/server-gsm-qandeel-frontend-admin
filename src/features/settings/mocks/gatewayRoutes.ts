// Mock of the payment gateway routes (`/admin/payment-gateways*`). The mock checks the fields the way the real server would and refuses
// to delete a gateway that took payments lately. A secret in a body is kept only as a hint and never sent back.
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { ProblemError } from '@/mocks/problem';
import type { GatewayAudience, PaymentGateway } from '../types';
import {
  bodyOf,
  conflict,
  fourDecimals,
  invalid,
  isDecimal,
  listAnswer,
  notFound,
  signedIn,
  textOf,
} from './http';
import { settingsFeatureStore } from './store';

const AUDIENCES: GatewayAudience[] = ['b2c', 'b2b', 'both'];
const MONEY_FIELDS = ['feeFixed', 'minAmount', 'maxAmount'] as const;

/** Applies the fields of a body to a gateway, collecting the problems. */
function applyFields(
  row: Omit<PaymentGateway, 'id'>,
  body: Record<string, unknown>,
  taken: (code: string) => boolean,
  problems: ProblemError[],
): Omit<PaymentGateway, 'id'> {
  const draft = { ...row };
  for (const key of ['name', 'driver', 'code'] as const) {
    if (!(key in body)) continue;
    const text = textOf(body[key]) ?? '';
    if (!text) problems.push({ field: key, message: key === 'name' ? 'Enter a name.' : `Enter the ${key}.` });
    else if (key === 'code' && text !== row.code && taken(text))
      problems.push({ field: 'code', message: 'Another payment method already uses this code.' });
    else draft[key] = text;
  }
  if ('audience' in body) {
    if (AUDIENCES.includes(body.audience as GatewayAudience))
      draft.audience = body.audience as GatewayAudience;
    else problems.push({ field: 'audience', message: 'Choose who can pay with it.' });
  }
  if ('feePercent' in body) {
    if (isDecimal(body.feePercent) && Number(body.feePercent) <= 100)
      draft.feePercent = fourDecimals(body.feePercent);
    else problems.push({ field: 'feePercent', message: 'Enter a percentage from 0 to 100.' });
  }
  for (const key of MONEY_FIELDS) {
    if (!(key in body)) continue;
    if (isDecimal(body[key])) draft[key] = fourDecimals(body[key]);
    else problems.push({ field: key, message: 'Enter an amount.' });
  }
  if (Number(draft.maxAmount) > 0 && Number(draft.maxAmount) < Number(draft.minAmount))
    problems.push({ field: 'maxAmount', message: 'The maximum cannot be below the minimum.' });
  if ('holdHours' in body) {
    const hours = Number(body.holdHours);
    if (Number.isInteger(hours) && hours >= 0 && hours <= 720) draft.holdHours = hours;
    else problems.push({ field: 'holdHours', message: 'Enter 0 to 720 hours.' });
  }
  if ('allowedGroupIds' in body) {
    const ids = Array.isArray(body.allowedGroupIds) ? body.allowedGroupIds.map(Number) : [];
    if (ids.every((id) => Number.isInteger(id) && id > 0)) draft.allowedGroupIds = ids;
    else problems.push({ field: 'allowedGroupIds', message: 'Choose merchant groups.' });
  }
  for (const key of ['supportsRefunds', 'supports3ds', 'isManual', 'isActive'] as const)
    if (key in body) draft[key] = body[key] === true;
  if ('instructions' in body) draft.instructions = textOf(body.instructions) ?? '';
  const secret = textOf(body.secret);
  if (secret) draft.secretHint = `••••${secret.slice(-4)}`;
  return draft;
}

const NEW_GATEWAY: Omit<PaymentGateway, 'id'> = {
  code: '',
  driver: '',
  name: '',
  audience: 'b2c',
  feePercent: '0.0000',
  feeFixed: '0.0000',
  minAmount: '0.0000',
  maxAmount: '0.0000',
  allowedGroupIds: [],
  supportsRefunds: false,
  supports3ds: false,
  isManual: false,
  instructions: '',
  holdHours: 0,
  isActive: true,
  createdAt: new Date(0).toISOString(),
  secretHint: null,
  volume30d: null,
};

/** The gateway routes. */
export const gatewayRoutes: HttpHandler[] = [
  http.get('*/admin/payment-gateways', ({ request }) =>
    signedIn(request, async () =>
      listAnswer((await settingsFeatureStore()).gateways.list(), request, ['name', 'code', 'driver']),
    ),
  ),

  http.get('*/admin/payment-gateways/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const row = (await settingsFeatureStore()).gateways.find(String(params.id));
      return row ? HttpResponse.json(row) : notFound('payment gateway', params.id);
    }),
  ),

  http.post('*/admin/payment-gateways', ({ request }) =>
    signedIn(request, async () => {
      const { gateways } = await settingsFeatureStore();
      const body = await bodyOf(request);
      const problems: ProblemError[] = [];
      const taken = (code: string) => gateways.list().some((row) => row.code === code);
      const draft = applyFields(
        { ...NEW_GATEWAY, createdAt: new Date().toISOString() },
        body,
        taken,
        problems,
      );
      for (const key of ['name', 'driver', 'code'] as const)
        if (!(key in body))
          problems.push({ field: key, message: key === 'name' ? 'Enter a name.' : `Enter the ${key}.` });
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(gateways.insert(draft), { status: 201 });
    }),
  ),

  http.patch('*/admin/payment-gateways/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { gateways } = await settingsFeatureStore();
      const row = gateways.find(String(params.id));
      if (!row) return notFound('payment gateway', params.id);
      const problems: ProblemError[] = [];
      const taken = (code: string) =>
        gateways.list().some((other) => other.id !== row.id && other.code === code);
      const draft = applyFields(row, await bodyOf(request), taken, problems);
      return problems.length > 0
        ? invalid(problems)
        : HttpResponse.json(gateways.patch(row.id, draft) ?? row);
    }),
  ),

  http.delete('*/admin/payment-gateways/:id', ({ request, params }) =>
    signedIn(request, async () => {
      const { gateways } = await settingsFeatureStore();
      const row = gateways.find(String(params.id));
      if (!row) return notFound('payment gateway', params.id);
      if (Number(row.volume30d ?? 0) > 0) {
        return conflict(
          'GATEWAY_IN_USE',
          'Payment method in use',
          `${row.name} took payments in the last 30 days. Turn it off instead of deleting it.`,
        );
      }
      gateways.remove(row.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
