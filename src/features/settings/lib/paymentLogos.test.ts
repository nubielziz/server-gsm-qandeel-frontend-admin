// Tests for the logo helpers: which bundled file names a ready-made method (and the fallback when the file is not there), the address of
// an uploaded logo, the client check of a chosen file, and the icon of a method with no logo. The folder's files are stubbed.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bundledLogo, fallbackIcon, logoForm, logoProblem, logoSrc, methodTypeOf } from './paymentLogos';

afterEach(() => vi.unstubAllEnvs());

const FILES = {
  vodafone_cash: '/assets/vodafone_cash-abc.png',
  binance_pay: '/assets/binance_pay-def.png',
};

describe('bundledLogo', () => {
  it('names the file of a preset by its key', () => {
    expect(bundledLogo('vodafone_cash', FILES)).toBe('/assets/vodafone_cash-abc.png');
  });

  it('lets the automatic Binance Pay use the file of Binance Pay', () => {
    expect(bundledLogo('binance_pay_auto', FILES)).toBe('/assets/binance_pay-def.png');
  });

  it('answers undefined when the file is not in the folder, so the icon shows', () => {
    expect(bundledLogo('instapay', FILES)).toBeUndefined();
    expect(bundledLogo('vodafone_cash', {})).toBeUndefined();
    expect(bundledLogo('binance_pay_auto', {})).toBeUndefined();
  });

  it('answers undefined for a method with no preset, or a key it does not know', () => {
    expect(bundledLogo(null, FILES)).toBeUndefined();
    expect(bundledLogo(undefined, FILES)).toBeUndefined();
    expect(bundledLogo('', FILES)).toBeUndefined();
    expect(bundledLogo('made_up', FILES)).toBeUndefined();
  });

  it('reads the real folder without failing, whichever files are in it', () => {
    expect(() => bundledLogo('vodafone_cash')).not.toThrow();
  });
});

describe('logoSrc', () => {
  it('joins the server’s media path with the API address and leaves a full address alone', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test');
    expect(logoSrc('/store/v1/media/abc.png')).toBe('http://api.test/store/v1/media/abc.png');
    expect(logoSrc('https://cdn.example/a.png')).toBe('https://cdn.example/a.png');
    expect(logoSrc('blob:http://localhost/1')).toBe('blob:http://localhost/1');
  });
});

describe('logoProblem', () => {
  it('refuses a type the server does not read', () => {
    expect(logoProblem({ type: 'image/gif', size: 10 })).toBe('Choose a JPEG, PNG or WebP picture.');
    expect(logoProblem({ type: 'image/svg+xml', size: 10 })).toBe('Choose a JPEG, PNG or WebP picture.');
  });

  it('refuses a file over 2 MiB and takes exactly 2 MiB', () => {
    expect(logoProblem({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toBe(
      'The logo is over 2 MiB. Choose a smaller file.',
    );
    expect(logoProblem({ type: 'image/png', size: 2 * 1024 * 1024 })).toBeNull();
    expect(logoProblem({ type: 'image/webp', size: 1 })).toBeNull();
  });
});

describe('logoForm', () => {
  it('holds the file as the one part named file', () => {
    const file = new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' });
    const form = logoForm(file);
    expect([...form.keys()]).toEqual(['file']);
    expect(form.get('file')).toBeInstanceOf(Blob);
  });
});

describe('the icon of a method with no logo', () => {
  it('is a bank for a bank transfer or Wise, a coin for crypto and a card otherwise', () => {
    expect(fallbackIcon('bank')).toBe('bank');
    expect(fallbackIcon('wise')).toBe('bank');
    expect(fallbackIcon('usdt')).toBe('coin');
    expect(fallbackIcon('card')).toBe('card');
  });

  it('is read from the driver the way the backend reads the top-up word', () => {
    expect(methodTypeOf({ driver: 'card', isManual: false })).toBe('card');
    expect(methodTypeOf({ driver: 'Stripe', isManual: false })).toBe('card');
    expect(methodTypeOf({ driver: 'crypto', isManual: false })).toBe('usdt');
    expect(methodTypeOf({ driver: 'binance_pay', isManual: true })).toBe('usdt');
    expect(methodTypeOf({ driver: 'crypto_transfer', isManual: true })).toBe('usdt');
    expect(methodTypeOf({ driver: 'wise', isManual: true })).toBe('wise');
    expect(methodTypeOf({ driver: 'bank_transfer', isManual: true })).toBe('bank');
  });

  it('is a bank for a manual driver nobody knows and a card for an automatic one', () => {
    expect(methodTypeOf({ driver: 'vodafone_cash', isManual: true })).toBe('bank');
    expect(methodTypeOf({ driver: 'cliq', isManual: true })).toBe('bank');
    expect(methodTypeOf({ driver: 'paypal', isManual: false })).toBe('card');
  });
});
