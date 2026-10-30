// How the API log reads: the colour and icon of a status code, the message column and the pretty JSON of a body. Ports codeCls,
// codeIcon and the row markup of `logTable` in 44-p-suppliers.js. The API log has an `action` (placeimeiorder, getimeiorder,
// accountinfo…), not the demo's `METHOD /path`, and its order id carries no channel (so no ORD- / SF- prefix).
import type { IconName } from '@/components/ui';
import type { JsonValue } from '@/lib/api';
import type { SupplierApiLog } from '../types';

/** A call slower than this is shown in the critical colour (the demo's 5 seconds). */
export const SLOW_CALL_MS = 5000;

/** The newest calls the log asks for. The demo showed 14; the box scrolls, so a few more cost nothing. */
export const LOG_LIMIT = 25;

/** The colour class and icon of a status code: green for 2xx, amber for "slow down" (429), red for everything else. */
export function codeStyle(code: number): { className: string; icon: IconName } {
  if (code >= 200 && code < 300) return { className: 'text-good-fg', icon: 'checkCircle' };
  if (code === 429) return { className: 'text-warn-fg', icon: 'clock' };
  return { className: 'text-crit-fg', icon: 'xCircle' };
}

/** The message column: the supplier's error text, or "OK" for a good call that has none. */
export function logMessage(log: Pick<SupplierApiLog, 'httpStatus' | 'error'>): string {
  if (log.error) return log.error;
  return log.httpStatus >= 200 && log.httpStatus < 300 ? 'OK' : '';
}

/** The order a call belongs to, as the log shows it (`#48666`); the API gives no channel, so no ORD- or SF- prefix. */
export function logOrderLabel(orderId: number): string {
  return `#${orderId}`;
}

/** A JSON body as indented text; a body that is only a string is shown as it is. */
export function prettyJson(value: JsonValue): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2) ?? '';
}
