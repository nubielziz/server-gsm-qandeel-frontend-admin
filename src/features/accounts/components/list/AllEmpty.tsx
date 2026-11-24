// AllEmpty: what the All view says when the list has no rows: no account at all (with a way to add one), none that match the
// search and the filters (with a way back to the whole population), or an empty population (no merchant rank yet, no guests, no retail
// accounts) with no filters on.
import { ButtonLink, EmptyState } from '@/components/ui';
import { accountsListPath } from '../../lib/paths';
import { filterWords, listLink, type ListAddress } from './listAddress';

export interface AllEmptyProps {
  address: ListAddress;
  /** No account exists at all (the All count is zero). */
  noAccounts: boolean;
  /** A search or a filter is on: clearing it may bring rows back. */
  filtered: boolean;
  /** The role may add an account (`clients:create`): the link to +Add Account is offered. */
  canAdd: boolean;
  /** The role is the Owner: only the Owner gives an account a merchant rank. */
  isOwner: boolean;
  /** The name of the rank the address filters by, when the list of ranks has it. */
  rankName?: string;
}

/** Picks the empty state that is true. */
export function AllEmpty({ address, noAccounts, filtered, canAdd, isOwner, rankName }: AllEmptyProps) {
  const add = accountsListPath({ view: 'add' });
  if (noAccounts) {
    return (
      <EmptyState
        icon="user"
        title="No accounts yet"
        cta={
          canAdd ? (
            <ButtonLink variant="primary" to={add}>
              Add an account
            </ButtonLink>
          ) : undefined
        }
      >
        Shop buyers and merchants show here, one account type told apart by its rank.
      </EmptyState>
    );
  }
  if (filtered) {
    return (
      <EmptyState
        icon="filter"
        title="No account matches"
        cta={<ButtonLink to={listLink({ chip: address.chip })}>Clear the search</ButtonLink>}
      >
        Nothing matches {filterWords(address, rankName)}. Try another search or remove a filter.
      </EmptyState>
    );
  }
  if (address.chip === 'merchants') {
    return (
      <EmptyState
        icon="user"
        title="No account with a merchant rank yet"
        cta={
          canAdd && isOwner ? (
            <ButtonLink variant="primary" to={add}>
              Add an account and give it a merchant rank
            </ButtonLink>
          ) : undefined
        }
      >
        {isOwner
          ? 'Add an account and give it a merchant rank.'
          : 'Only the Owner gives an account a merchant rank.'}
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="user" title={address.chip === 'guests' ? 'No guests' : 'No retail accounts yet'}>
      {address.chip === 'guests'
        ? 'A guest is someone who bought in the shop without making an account.'
        : 'People who sign up or buy in the shop show here.'}
    </EmptyState>
  );
}
