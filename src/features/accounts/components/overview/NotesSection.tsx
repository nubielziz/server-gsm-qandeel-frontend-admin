// NotesSection: the internal notes of the account, as text, with a link to Profile where they are edited. Nothing here is saved.
import { Link } from 'react-router';
import { FormRow, SectionHeading } from '@/components/ui';
import { accountPath } from '../../lib/paths';
import type { AccountDetail } from '../../types';
import { Value } from './Value';

/** The notes row. An anonymized account has no notes left and no Profile to edit them in. */
export function NotesSection({ account }: { account: AccountDetail }) {
  if (account.status === 'anonymized') return null;
  const notes = account.internalNotes.trim();
  return (
    <>
      <SectionHeading as="h3">Notes</SectionHeading>
      <FormRow label="Internal notes" hint="Only your team sees this.">
        <Value
          muted={notes === ''}
          action={
            <Link className="link text-sm" to={accountPath(account.id, 'profile')}>
              Edit in Profile
            </Link>
          }
        >
          {notes === '' ? 'None' : <span className="whitespace-pre-wrap">{notes}</span>}
        </Value>
      </FormRow>
    </>
  );
}
