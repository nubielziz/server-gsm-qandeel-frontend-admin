// The words of the Prices part: what a rank's discount reads as, the kind of a service, and what an account pays without a fixed price.
import type { Decimal } from '@/lib/api';
import { TYPE_LABEL } from '@/lib/serviceTypes';
import { percentText } from '../../lib/ranks';

/** "8% off base prices" for a rank with a discount, "base prices" for one without. */
export function discountWords(discountPercent: Decimal): string {
  return Number(discountPercent) > 0 ? `${percentText(discountPercent)} off base prices` : 'base prices';
}

/** The kind of a service in the console's words ("imei" is "IMEI"); a kind the console does not know shows as the server sent it. */
export function kindWord(type: string | undefined): string {
  if (!type) return '';
  return Object.hasOwn(TYPE_LABEL, type) ? TYPE_LABEL[type as keyof typeof TYPE_LABEL] : type;
}

/** What an account pays on a service that has no fixed price: the price of its rank. */
export function paysWords(rankName: string): string {
  return `pays the ${rankName} price`;
}
