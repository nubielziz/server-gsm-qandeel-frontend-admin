// How an entry names the person (or the system) behind it.
import type { AuditLog } from '../types';

/** The name the server saved with the entry, else "System" for the system and "Staff #3" for a person it did not name. */
export function actorText(row: Pick<AuditLog, 'actorType' | 'actorId' | 'actorName'>): string {
  const name = row.actorName?.trim();
  if (name) return name;
  if (row.actorType === 'system') return 'System';
  return row.actorId ? `Staff #${row.actorId}` : 'Someone';
}
