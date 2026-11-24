// How an entry names the person (or the system) behind it.
import type { AuditLog } from '../types';

// What an actor of each kind is called when the server saved no name with the entry. `client` and `customer` are the words of rows
// written before the accounts were merged: a client's number is an account number, a customer's number is the old record's.
const ACTOR_WORD: Readonly<Record<string, string>> = {
  staff: 'Staff',
  account: 'Account',
  client: 'Account',
  customer: 'Customer',
};

/**
 * The name the server saved with the entry, else "System" for the system and "Staff #3" or "Account #7" for a person it did not
 * name. An old `customer` actor says "Customer #19": its number is the old customer record's, never an account number.
 */
export function actorText(row: Pick<AuditLog, 'actorType' | 'actorId' | 'actorName'>): string {
  const name = row.actorName?.trim();
  if (name) return name;
  if (row.actorType === 'system') return 'System';
  if (!row.actorId) return 'Someone';
  const word = Object.hasOwn(ACTOR_WORD, row.actorType) ? ACTOR_WORD[row.actorType] : 'Staff';
  return `${word} #${row.actorId}`;
}
