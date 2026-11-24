// AddRankView: the "+Add Rank" view: the rank form with one "Add" button in the pinned bar. A new rank is a merchant rank; after it the Ranks view
// opens. Needs groups:read and groups:create. Ports the new-group dialog of the merchants page.
import { useNavigate } from 'react-router';
import { useCreateRank } from '../../hooks/useRanks';
import { ranksPath } from '../../lib/paths';
import type { AccountsViewProps } from '../types';
import { RankForm } from './RankForm';
import { createBody, NEW_RANK } from './rankForm';

/** Makes a merchant rank. The server's refusal of a taken name lands under the name. */
export function AddRankView({ grants }: AccountsViewProps) {
  const create = useCreateRank();
  const navigate = useNavigate();
  return (
    <RankForm
      heading="Add Rank"
      submitLabel="Add"
      initial={NEW_RANK}
      lock={grants.needs('groups:create')}
      onSubmit={async (values) => {
        await create.mutateAsync(createBody(values));
        void navigate(ranksPath());
      }}
    />
  );
}
