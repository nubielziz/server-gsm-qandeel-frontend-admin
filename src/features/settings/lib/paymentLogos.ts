// The logos of the payment methods (feature 32, backend B232): which bundled file names a ready-made method, how to load an uploaded
// logo, which icon stands in when there is neither, and the client check of a chosen picture. Pure functions; the files themselves are
// in `src/assets/payment-logos/` (docs/LOGOS.md says where each one comes from).
import type { IconName } from '@/components/ui';
import { apiUrl } from '@/lib/api';
import type { GatewayMethodType, PaymentGateway } from '../types';

/** The picture types the server reads for a logo (the same as a listing picture). */
export const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** The largest logo the server takes: 2 MiB (413 above it). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Reads the folder of bundled logos by file name without the extension (`vodafone_cash.png` is `vodafone_cash`).
 * Eager, so a file the lead adds later is picked up with no code change; with no files the object is empty and every method shows its icon.
 */
const BUNDLED = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../../assets/payment-logos/*.{png,webp,svg,jpg,jpeg}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [/([^/]+)\.[a-z]+$/.exec(path)?.[1] ?? path, url]),
) as Record<string, string>;

/** Presets that share the file of another one (the automatic Binance Pay uses the logo of Binance Pay). */
const SHARED_FILE: Record<string, string> = { binance_pay_auto: 'binance_pay' };

/**
 * The address of the bundled logo of a preset, or `undefined` when the preset has none or its file is not in the folder.
 * `sources` is the folder's files by name; the tests pass their own, the app uses the real folder.
 */
export function bundledLogo(
  preset: string | null | undefined,
  sources: Readonly<Record<string, string>> = BUNDLED,
): string | undefined {
  if (!preset) return undefined;
  return sources[preset] ?? sources[SHARED_FILE[preset] ?? ''];
}

/**
 * Where to load an uploaded logo from. The server sends a root-relative `/store/v1/media/<name>` path of the API's own address, so it is
 * joined with the API base; an absolute, `blob:` or `data:` address is used as it is.
 */
export function logoSrc(logoUrl: string): string {
  return /^(https?:|blob:|data:)/i.test(logoUrl) ? logoUrl : apiUrl(logoUrl);
}

/** The multipart body of an upload: one part named `file`. */
export function logoForm(file: File): FormData {
  const form = new FormData();
  form.append('file', file);
  return form;
}

/** A client check of a chosen file before it is sent: a sentence when it is clearly refused, else `null`. The server decides the rest. */
export function logoProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return 'Choose a JPEG, PNG or WebP picture.';
  if (file.size > LOGO_MAX_BYTES) return 'The logo is over 2 MiB. Choose a smaller file.';
  return null;
}

// The top-up word of each driver the backend knows (`topupMethodOf`): a driver it does not know is a bank transfer when manual.
const TYPE_OF_DRIVER: Record<string, GatewayMethodType> = {
  card: 'card',
  stripe: 'card',
  crypto: 'usdt',
  usdt: 'usdt',
  wise: 'wise',
  bank: 'bank',
  crypto_transfer: 'usdt',
  binance_pay: 'usdt',
  nowpayments: 'usdt',
  binance_pay_auto: 'usdt',
};

/** The top-up word a saved method stands for, which decides its generic icon. */
export function methodTypeOf(gateway: Pick<PaymentGateway, 'driver' | 'isManual'>): GatewayMethodType {
  return TYPE_OF_DRIVER[gateway.driver.trim().toLowerCase()] ?? (gateway.isManual ? 'bank' : 'card');
}

/** The icon for a method with no logo: a bank for a bank transfer, a coin for crypto, a card otherwise. */
export function fallbackIcon(type: GatewayMethodType): IconName {
  if (type === 'bank' || type === 'wise') return 'bank';
  return type === 'usdt' ? 'coin' : 'card';
}
