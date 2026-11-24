// How the screens name a customer's status, and the lists of reasons the dialogs offer. Ports CUST_STATUS and SUSPEND_REASONS of
// 12-state-b2c.js and the block reasons of 48-p-customers.js.
import type { BadgeTone, IconName } from '@/components/ui';
import type { CustomerStatus } from '../types';

/** The badge of each status: word, tone and icon (status is never colour alone). */
export const STATUS_BADGE: Readonly<
  Record<CustomerStatus, { label: string; tone: BadgeTone; icon: IconName }>
> = {
  active: { label: 'Active', tone: 'good', icon: 'checkCircle' },
  suspended: { label: 'Suspended', tone: 'warn', icon: 'pause' },
  blocked: { label: 'Blocked', tone: 'crit', icon: 'ban' },
  anonymized: { label: 'Anonymised', tone: 'neutral', icon: 'user' },
};

/**
 * A value the console does not know (a new status on the server) shows as it is, so it is never a blank or a
 * crash. An empty or missing value reads "Unknown".
 */
export function rawLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : 'Unknown';
}

/** The badge of a status. A status this console does not know gets a neutral badge with its raw value as the word. */
export function statusBadge(status: string): { label: string; tone: BadgeTone; icon: IconName } {
  return Object.hasOwn(STATUS_BADGE, status)
    ? STATUS_BADGE[status as CustomerStatus]
    : { label: rawLabel(status), tone: 'neutral', icon: 'info' };
}

/** Why a person pauses an account; the dialog offers exactly these (SUSPEND_REASONS in the demo). */
export const SUSPEND_REASONS = [
  'Customer asked to pause the account',
  'Account may be compromised',
  'Unusual activity under review',
  'Waiting for proof of identity or payment',
  'Other',
] as const;

/** Why a person blocks a customer; the dialog offers exactly these. */
export const BLOCK_REASONS = [
  'Chargeback or dispute',
  'Card testing or fraud',
  'Abuse of refunds',
  'Other',
] as const;
