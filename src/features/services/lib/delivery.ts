// The delivery time of a service as the +Add Service view and the Overview part show it: a number and a unit (minutes, hours or days), while
// the API stores whole minutes (`slaMinutes`). Pure text-and-number helpers; the server stays the authority on what it accepts.

/** The units of the delivery time box. */
export type DeliveryUnit = 'minutes' | 'hours' | 'days';

/** The unit menu, in the order it is shown. */
export const DELIVERY_UNITS: readonly { value: DeliveryUnit; label: string }[] = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
];

const MINUTES_IN: Record<DeliveryUnit, number> = { minutes: 1, hours: 60, days: 1440 };

/** The largest number of minutes the API takes (a 32-bit integer). */
export const MAX_DELIVERY_MINUTES = 2_147_483_647;

const WHOLE = /^\d+$/;

/**
 * The number and unit that show `minutes`: the largest unit that holds the time exactly, so 1440 is "1 Days" and 90 is "90 Minutes".
 * A time the API sends that is not a whole number of minutes (it never is) is shown in minutes.
 */
export function deliveryOf(minutes: number): { delivery: string; unit: DeliveryUnit } {
  if (Number.isInteger(minutes) && minutes > 0) {
    if (minutes % MINUTES_IN.days === 0) return { delivery: String(minutes / MINUTES_IN.days), unit: 'days' };
    if (minutes % MINUTES_IN.hours === 0)
      return { delivery: String(minutes / MINUTES_IN.hours), unit: 'hours' };
  }
  return { delivery: String(minutes), unit: 'minutes' };
}

/** The minutes a typed number and unit mean, or null while the number is not a whole number of at least 1 that the API can store. */
export function deliveryMinutes(delivery: string, unit: DeliveryUnit): number | null {
  const text = delivery.trim();
  if (!WHOLE.test(text)) return null;
  const minutes = Number(text) * MINUTES_IN[unit];
  return minutes >= 1 && minutes <= MAX_DELIVERY_MINUTES ? minutes : null;
}

/** The message under the delivery time box, or true when it is fine. */
export function deliveryProblem(delivery: string, unit: DeliveryUnit): string | true {
  const text = delivery.trim();
  if (!WHOLE.test(text) || Number(text) < 1) return 'Enter a whole number, 1 or more.';
  return deliveryMinutes(text, unit) === null ? 'That is longer than the system can store.' : true;
}
