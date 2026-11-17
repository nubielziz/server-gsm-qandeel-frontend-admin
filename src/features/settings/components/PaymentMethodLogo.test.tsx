// Tests for PaymentMethodLogo: the order uploaded logo, bundled logo of the preset, generic icon, with the folder of bundled files
// stubbed so both a present file and a missing one are covered; and a picture that fails to load falls to the next one.
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethodLogo } from './PaymentMethodLogo';
import type * as Logos from '../lib/paymentLogos';

// The folder of bundled logos as a test sees it: the stub's files are the only ones there.
const folder = vi.hoisted(() => ({ files: {} as Record<string, string> }));
vi.mock('../lib/paymentLogos', async (importOriginal) => {
  const real = await importOriginal<typeof Logos>();
  return {
    ...real,
    bundledLogo: (preset: string | null | undefined) => real.bundledLogo(preset, folder.files),
  };
});

beforeEach(() => {
  folder.files = { vodafone_cash: '/assets/vodafone_cash.png', binance_pay: '/assets/binance_pay.png' };
  vi.stubEnv('VITE_API_BASE_URL', 'http://api.test');
});
afterEach(() => vi.unstubAllEnvs());

const source = () => document.querySelector('[data-logo-source]')?.getAttribute('data-logo-source');
const icon = () => document.querySelector('[data-logo-icon]')?.getAttribute('data-logo-icon');

describe('PaymentMethodLogo', () => {
  it('shows the uploaded logo before anything else', () => {
    render(
      <PaymentMethodLogo
        name="Vodafone Cash"
        logoUrl="/store/v1/media/own.png"
        preset="vodafone_cash"
        methodType="bank"
      />,
    );
    expect(source()).toBe('uploaded');
    expect(screen.getByRole('img', { name: 'Vodafone Cash logo' })).toHaveAttribute(
      'src',
      'http://api.test/store/v1/media/own.png',
    );
  });

  it('shows the bundled logo of the preset when nothing was uploaded', () => {
    render(
      <PaymentMethodLogo name="Vodafone Cash" logoUrl={null} preset="vodafone_cash" methodType="bank" />,
    );
    expect(source()).toBe('bundled');
    expect(screen.getByRole('img', { name: 'Vodafone Cash logo' })).toHaveAttribute(
      'src',
      '/assets/vodafone_cash.png',
    );
  });

  it('gives the automatic Binance Pay the logo of Binance Pay', () => {
    render(<PaymentMethodLogo name="Binance Pay (automatic)" preset="binance_pay_auto" methodType="usdt" />);
    expect(source()).toBe('bundled');
    expect(screen.getByRole('img')).toHaveAttribute('src', '/assets/binance_pay.png');
  });

  it('falls back to an icon when the preset’s file is not in the folder', () => {
    folder.files = {};
    render(<PaymentMethodLogo name="Vodafone Cash" preset="vodafone_cash" methodType="bank" />);
    expect(source()).toBe('icon');
    expect(icon()).toBe('bank');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each([
    ['bank', 'bank'],
    ['wise', 'bank'],
    ['usdt', 'coin'],
    ['card', 'card'],
  ] as const)('draws the %s type of a custom method as the %s icon', (methodType, name) => {
    render(<PaymentMethodLogo name="Mine" methodType={methodType} />);
    expect(source()).toBe('icon');
    expect(icon()).toBe(name);
  });

  it('shows an uploaded logo over an icon for a custom method', () => {
    render(
      <PaymentMethodLogo name="Mine" logoUrl="/store/v1/media/mine.webp" preset={null} methodType="card" />,
    );
    expect(source()).toBe('uploaded');
  });

  it('falls to the next picture, then to the icon, when one does not load', () => {
    render(
      <PaymentMethodLogo
        name="Vodafone Cash"
        logoUrl="/store/v1/media/gone.png"
        preset="vodafone_cash"
        methodType="bank"
      />,
    );
    expect(source()).toBe('uploaded');
    fireEvent.error(screen.getByRole('img'));
    expect(source()).toBe('bundled');
    fireEvent.error(screen.getByRole('img'));
    expect(source()).toBe('icon');
    expect(icon()).toBe('bank');
  });

  it('says "<name> logo" for a screen reader, and nothing where the name is printed beside it', () => {
    const { rerender } = render(
      <PaymentMethodLogo name="Vodafone Cash" preset="vodafone_cash" methodType="bank" />,
    );
    expect(screen.getByRole('img', { name: 'Vodafone Cash logo' })).toBeInTheDocument();
    rerender(<PaymentMethodLogo nameShown name="Vodafone Cash" preset="vodafone_cash" methodType="bank" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute('alt', '');
    expect(source()).toBe('bundled');
  });
});
