// Tests for the API functions of feature 32 (backend B232), run against the dev mock API: the catalog of ready-made payment methods, the
// create body that carries `preset` (and the four refusals of the server), and the logo upload and removal with their refusals.
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPost, type ApiError } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import type { CreateGatewayBody } from '../types';
import {
  createGateway,
  getGateway,
  listGatewayPresets,
  removeGatewayLogo,
  updateGateway,
  uploadGatewayLogo,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const CARD = 1; // the demo's card gateway: a custom method

/** A create body made from a preset the way the dialog fills it. */
const fromPreset = (patch: Partial<CreateGatewayBody> = {}): CreateGatewayBody => ({
  code: 'vodafone_cash',
  driver: 'vodafone_cash',
  name: 'Vodafone Cash',
  audience: 'both',
  feePercent: '0',
  feeFixed: '0',
  minAmount: '0',
  maxAmount: '0',
  allowedGroupIds: [],
  supportsRefunds: false,
  supports3ds: false,
  isManual: true,
  instructions: 'Send the amount to 0100.',
  holdHours: 0,
  isActive: false,
  preset: 'vodafone_cash',
  ...patch,
});

const refusal = async (promise: Promise<unknown>) =>
  (await promise.catch((error: unknown) => error)) as ApiError;
const picture = (type = 'image/png') => new File([new Uint8Array([1, 2, 3])], 'logo.png', { type });
const form = (file: File) => {
  const body = new FormData();
  body.append('file', file);
  return body;
};

describe('listGatewayPresets', () => {
  it('reads the plain array of the catalog from its route', async () => {
    const requests = recordRequests();
    const presets = await listGatewayPresets();
    expect(requests.last()).toMatchObject({ method: 'GET' });
    expect(requests.last().url.pathname).toBe('/admin/payment-gateway-presets');
    expect(Array.isArray(presets)).toBe(true);
  });

  it('is the backend’s catalog word for word, in its order (`GATEWAY_PRESETS` of gateway-presets.ts)', async () => {
    const presets = await listGatewayPresets();
    // The six templates are copied from the backend file; the two automatic entries have none.
    expect(presets).toEqual([
      {
        key: 'bank_transfer',
        name: 'Bank transfer',
        kind: 'manual',
        available: true,
        driver: 'bank_transfer',
        methodType: 'bank',
        instructions:
          'Bank: ________, account name: ________, IBAN: ________. Write your top-up number as the reference and upload the receipt.',
      },
      {
        key: 'crypto_transfer',
        name: 'Crypto transfer',
        kind: 'manual',
        available: true,
        driver: 'crypto_transfer',
        methodType: 'usdt',
        instructions:
          'Send USDT on the ________ network to the address ________ and upload a screenshot with the transaction hash.',
      },
      {
        key: 'vodafone_cash',
        name: 'Vodafone Cash',
        kind: 'manual',
        available: true,
        driver: 'vodafone_cash',
        methodType: 'bank',
        instructions:
          'Send the amount to the Vodafone Cash number ________ and upload a screenshot of the transfer. Write your top-up number in the note.',
      },
      {
        key: 'fawry_transfer',
        name: 'Fawry',
        kind: 'manual',
        available: true,
        driver: 'fawry_transfer',
        methodType: 'bank',
        instructions:
          'Pay the amount through Fawry to the account ________ and upload a photo or screenshot of the receipt. Write your top-up number in the note.',
      },
      {
        key: 'instapay',
        name: 'InstaPay',
        kind: 'manual',
        available: true,
        driver: 'instapay',
        methodType: 'bank',
        instructions:
          'Send the amount by InstaPay to the address ________ and upload a screenshot of the transfer. Write your top-up number in the note.',
      },
      {
        key: 'binance_pay',
        name: 'Binance Pay',
        kind: 'manual',
        available: true,
        driver: 'binance_pay',
        methodType: 'usdt',
        instructions:
          'Send the amount by Binance Pay to the Pay ID ________ and upload a screenshot of the transfer. Write your top-up number in the note.',
      },
      {
        key: 'nowpayments',
        name: 'NOWPayments',
        kind: 'automatic',
        available: false,
        driver: 'nowpayments',
        methodType: 'usdt',
        instructions: '',
      },
      {
        key: 'binance_pay_auto',
        name: 'Binance Pay (automatic)',
        kind: 'automatic',
        available: false,
        driver: 'binance_pay_auto',
        methodType: 'usdt',
        instructions: '',
      },
    ]);
  });

  it('gives a manual entry an instructions template with blanks and an automatic one none', async () => {
    const presets = await listGatewayPresets();
    for (const preset of presets) {
      if (preset.kind === 'manual') expect(preset.instructions).toContain('________');
      else expect(preset.instructions).toBe('');
    }
  });
});

describe('createGateway with a preset', () => {
  it('sends preset in the body and answers the row with it and no logo', async () => {
    const requests = recordRequests();
    const created = await createGateway(fromPreset());
    expect(requests.last().body).toMatchObject({ preset: 'vodafone_cash', isManual: true });
    expect(created).toMatchObject({ preset: 'vodafone_cash', logoUrl: null, isManual: true });
    expect((await getGateway(created.id)).preset).toBe('vodafone_cash');
  });

  it('lets two methods come from one preset (two bank accounts)', async () => {
    const bank = { preset: 'bank_transfer', driver: 'bank_transfer', name: 'Bank transfer' };
    const first = await createGateway(fromPreset({ ...bank, code: 'bank_transfer' }));
    const second = await createGateway(fromPreset({ ...bank, code: 'bank_transfer_2' }));
    expect([first.preset, second.preset]).toEqual(['bank_transfer', 'bank_transfer']);
  });

  it('adds a custom method with no preset, as before', async () => {
    const { preset: _preset, ...custom } = fromPreset({ code: 'cliq', driver: 'cliq', name: 'CliQ' });
    const created = await createGateway(custom);
    expect(created.preset).toBeNull();
  });

  it('refuses a key it does not know, on preset', async () => {
    const error = await refusal(createGateway(fromPreset({ preset: 'paypal' })));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.preset).toBeDefined();
  });

  it('refuses an entry that cannot be added yet, on preset', async () => {
    const error = await refusal(
      createGateway(fromPreset({ preset: 'nowpayments', driver: 'nowpayments', isManual: false })),
    );
    expect(error.status).toBe(422);
    expect(error.fieldErrors.preset?.[0]).toContain('NOWPayments');
  });

  it('refuses a kind that is not the preset’s, on isManual', async () => {
    const error = await refusal(createGateway(fromPreset({ isManual: false })));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.isManual).toBeDefined();
  });

  it('refuses a driver that is not the preset’s, on driver', async () => {
    const error = await refusal(createGateway(fromPreset({ driver: 'other' })));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.driver).toBeDefined();
  });

  it('reports every problem of an entry that cannot be added, not only the preset', async () => {
    const error = await refusal(
      createGateway(fromPreset({ preset: 'nowpayments', driver: 'other', isManual: true })),
    );
    expect(error.status).toBe(422);
    expect(Object.keys(error.fieldErrors).sort()).toEqual(['driver', 'isManual', 'preset']);
    expect(error.fieldErrors.preset?.[0]).toBe(
      'NOWPayments cannot be added yet: its connection is not built.',
    );
    expect(error.fieldErrors.isManual?.[0]).toBe('NOWPayments is an automatic method.');
    expect(error.fieldErrors.driver?.[0]).toBe('The driver of NOWPayments is "nowpayments".');
  });

  it('reports only the preset for a key it does not know', async () => {
    const error = await refusal(
      createGateway(fromPreset({ preset: 'paypal', driver: 'other', isManual: false })),
    );
    expect(Object.keys(error.fieldErrors)).toEqual(['preset']);
  });

  it('does not change a preset on an edit', async () => {
    const created = await createGateway(fromPreset());
    const body = { name: 'Vodafone Cash 2', preset: 'instapay' } as Parameters<typeof updateGateway>[1];
    const updated = await updateGateway(created.id, body);
    expect(updated).toMatchObject({ name: 'Vodafone Cash 2', preset: 'vodafone_cash' });
  });
});

describe('editing a method made from a preset', () => {
  it('refuses another driver, on driver', async () => {
    const created = await createGateway(fromPreset());
    const error = await refusal(updateGateway(created.id, { driver: 'card' }));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.driver?.[0]).toBe('The driver of Vodafone Cash is "vodafone_cash".');
    expect((await getGateway(created.id)).driver).toBe('vodafone_cash');
  });

  it('refuses the other kind, on isManual', async () => {
    const created = await createGateway(fromPreset());
    const error = await refusal(updateGateway(created.id, { isManual: false }));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.isManual?.[0]).toBe('Vodafone Cash is a manual method.');
    expect((await getGateway(created.id)).isManual).toBe(true);
  });

  it('reports both together, and measures them on the merged row', async () => {
    const created = await createGateway(fromPreset());
    const both = await refusal(updateGateway(created.id, { driver: 'card', isManual: false }));
    expect(Object.keys(both.fieldErrors).sort()).toEqual(['driver', 'isManual']);
    // The same driver and kind in the body change nothing, so the rest of the edit goes through.
    const same = await updateGateway(created.id, {
      driver: 'vodafone_cash',
      isManual: true,
      name: 'Vodafone',
    });
    expect(same).toMatchObject({
      name: 'Vodafone',
      driver: 'vodafone_cash',
      isManual: true,
      preset: 'vodafone_cash',
    });
  });

  it('leaves a custom method free to change its driver and its kind', async () => {
    const changed = await updateGateway(CARD, { driver: 'paypal', isManual: true });
    expect(changed).toMatchObject({ driver: 'paypal', isManual: true, preset: null });
  });
});

describe('uploadGatewayLogo and removeGatewayLogo', () => {
  it('posts the file as the part named file and answers the row with the logo address', async () => {
    const requests = recordRequests();
    const updated = await uploadGatewayLogo(CARD, form(picture()));
    const sent = requests.last();
    expect(sent.method).toBe('POST');
    expect(sent.url.pathname).toBe(`/admin/payment-gateways/${CARD}/logo`);
    expect(sent.form?.get('file')).toBeInstanceOf(Blob);
    expect(updated.logoUrl).toEqual(expect.any(String));
    expect((await getGateway(CARD)).logoUrl).toBe(updated.logoUrl);
  });

  it('removes the logo with a DELETE that answers 204, also when there was none', async () => {
    await expect(removeGatewayLogo(CARD)).resolves.toBeUndefined();
    await uploadGatewayLogo(CARD, form(picture()));
    const requests = recordRequests();
    await expect(removeGatewayLogo(CARD)).resolves.toBeUndefined();
    expect(requests.last()).toMatchObject({ method: 'DELETE' });
    expect(requests.last().url.pathname).toBe(`/admin/payment-gateways/${CARD}/logo`);
    expect((await getGateway(CARD)).logoUrl).toBeNull();
  });

  it('refuses a type it does not read, on file (422)', async () => {
    const error = await refusal(uploadGatewayLogo(CARD, form(picture('image/gif'))));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.file?.[0]).toContain('JPEG, PNG or WebP');
  });

  it('refuses a request with no file part, on file (422)', async () => {
    const error = await refusal(uploadGatewayLogo(CARD, new FormData()));
    expect(error.status).toBe(422);
    expect(error.fieldErrors.file).toBeDefined();
  });

  it('shows a 413 of the server as an error with its words', async () => {
    // The test environment sends a file part empty, so the mock cannot measure the size here: the server's answer is played instead.
    mockServer.use(
      http.post('*/admin/payment-gateways/:id/logo', () =>
        problem(413, 'PAYLOAD_TOO_LARGE', 'Logo too large', 'A logo can be at most 2 MiB.'),
      ),
    );
    const error = await refusal(uploadGatewayLogo(CARD, form(picture())));
    expect(error).toMatchObject({ status: 413, detail: 'A logo can be at most 2 MiB.' });
  });

  it('refuses a body that is not multipart (415)', async () => {
    const error = await refusal(apiPost('/admin/payment-gateways/1/logo', { file: 'x' }));
    expect(error.status).toBe(415);
  });

  it('answers 404 for a method that does not exist, on upload and on removal', async () => {
    expect((await refusal(uploadGatewayLogo(9999, form(picture())))).status).toBe(404);
    expect((await refusal(removeGatewayLogo(9999))).status).toBe(404);
  });
});
