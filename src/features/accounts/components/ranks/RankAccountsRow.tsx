// RankAccountsRow: the "Accounts" row of the Edit rank form: how many accounts are in the rank, what a change does to them, and a link to them.
import { Link } from 'react-router';
import { FormRow, ReadValue } from '@/components/ui';
import type { Rank } from '../../types';
import { rankAccountsPath } from './rankList';

/**
 * "N accounts are in this rank. A change applies to their next order." with the link to them (the All view filtered by the rank). A rank
 * with none says so; a server that sends no count leaves the row out.
 */
export function RankAccountsRow({ rank }: { rank: Rank }) {
  const count = rank.accountCount;
  if (count === undefined) return null;
  return (
    <FormRow label="Accounts">
      <ReadValue className="flex-wrap gap-x-2">
        {count === 0 ? (
          <span>No account is in this rank yet.</span>
        ) : (
          <>
            <span>
              {count} {count === 1 ? 'account is' : 'accounts are'} in this rank. A change applies to their
              next order.
            </span>
            <Link className="link" to={rankAccountsPath(rank)}>
              Show {count === 1 ? 'it' : 'them'}
            </Link>
          </>
        )}
      </ReadValue>
    </FormRow>
  );
}
