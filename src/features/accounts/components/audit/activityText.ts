// The words of the Activity Log rows: what happened and who did it. Pure helpers, so the part stays a table.
import type { AuditLog } from '@/features/audit';

// What a person of each kind is called when the server saved no name with the entry. `client` and `customer` are the words of rows
// written before the accounts were merged: a client's number is an account number, a customer's number is the old record's.
const ACTOR_WORD: Readonly<Record<string, string>> = {
  staff: 'Staff',
  account: 'Account',
  client: 'Account',
  customer: 'Customer',
};

/** The "What" cell: the readable action and the name the record had at the time, "edited details of Zain Mobile Hub". */
export function whatText(row: Pick<AuditLog, 'action' | 'entityLabel'>): string {
  const label = row.entityLabel?.trim();
  return label ? `${row.action} ${label}` : row.action;
}

/**
 * The "Who" cell: the name the server saved with the entry; else "System" for the system; else "Staff #3" (or "Account #7") for a person
 * it did not name; else "Someone". An old `customer` actor says "Customer #19": that number is the old record's, never an account number.
 */
export function whoText(row: Pick<AuditLog, 'actorType' | 'actorId' | 'actorName'>): string {
  const name = row.actorName?.trim();
  if (name) return name;
  if (row.actorType === 'system') return 'System';
  if (!row.actorId) return 'Someone';
  const word = Object.hasOwn(ACTOR_WORD, row.actorType) ? ACTOR_WORD[row.actorType] : 'Staff';
  return `${word} #${row.actorId}`;
}
