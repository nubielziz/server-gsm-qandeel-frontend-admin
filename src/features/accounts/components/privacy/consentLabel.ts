// What a consent record says in words: the document it was given for (with its version) or, when the record names no document, its
// purpose. Re-hosts the consent lines of the old customers page for the Privacy and risk part of every account.
import type { ConsentRecord } from '../../types';

// What each purpose means, for a record that carries no document name of its own.
const PURPOSE_LABEL: Readonly<Record<string, string>> = {
  terms: 'Terms of service',
  privacy: 'Privacy policy',
  refund_policy: 'Refund policy',
  withdrawal_waiver: 'Digital service starts now, right of withdrawal is waived',
  marketing: 'Marketing emails (opt-in)',
};

/**
 * What a consent record says: its document with the version when it has one, else the purpose in words. A purpose the console does not
 * know shows as readable text (underscores become spaces, the first letter is a capital), so a new purpose is never a blank or a crash.
 *
 * @param record the purpose and the document of one consent record.
 * @returns the line to show.
 */
export function consentLabel(record: Pick<ConsentRecord, 'purpose' | 'document'>): string {
  if (record.document) return record.document;
  if (Object.hasOwn(PURPOSE_LABEL, record.purpose)) return PURPOSE_LABEL[record.purpose] as string;
  const spaced = record.purpose.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
