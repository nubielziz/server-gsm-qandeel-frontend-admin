// EditRankView: the "Edit rank" view (`?view=edit-rank&id=<id>`): the same form as +Add Rank, filled with the rank, with one "Save" button in the
// pinned bar that is off while nothing changed. Only what changed is sent. Needs groups:read; saving needs groups:update.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ButtonLink, EmptyState, ErrorState, Skeleton, toast } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useUpdateRank } from '../../hooks/useRanks';
import { ranksPath } from '../../lib/paths';
import type { Rank } from '../../types';
import type { AccountsViewProps } from '../types';
import { RankForm } from './RankForm';
import { changesOf, rankValues } from './rankForm';
import { useRank } from './useRank';

// The id the address names, or null when it names none.
function rankIdOf(raw: string | null): Id | null {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

function NoRank({ detail }: { detail: string }) {
  return (
    <EmptyState
      icon="tag"
      title="This rank does not exist"
      cta={<ButtonLink to={ranksPath()}>Back to Ranks</ButtonLink>}
    >
      {detail}
    </EmptyState>
  );
}

// The form of a rank that has been read. `base` is the rank the next save compares with: the one the form opened on, then the one the server last
// returned, so a second save sends only what changed since the first.
function RankEditor({ rank, grants }: AccountsViewProps & { rank: Rank }) {
  const update = useUpdateRank();
  const [base, setBase] = useState(rank);
  return (
    <RankForm
      heading={`Edit ${base.name}`}
      submitLabel="Save"
      initial={rankValues(base)}
      rank={base}
      lock={grants.needs('groups:update')}
      onSubmit={async (values) => {
        const body = changesOf(values, base);
        if (Object.keys(body).length === 0) {
          toast({ kind: 'info', title: 'Nothing changed' });
          return null;
        }
        const saved = await update.mutateAsync({ rank: base, body });
        // The answer may leave out the count of accounts: keep the one we had.
        setBase({ ...saved, accountCount: saved.accountCount ?? base.accountCount });
        return rankValues(saved);
      }}
    />
  );
}

// Reads the rank, or says why it cannot be shown.
function RankLoader({ id, grants }: AccountsViewProps & { id: Id }) {
  const { rank, notFound, query } = useRank(id);
  if (rank) return <RankEditor rank={rank} grants={grants} />;
  if (notFound) return <NoRank detail={`There is no rank #${id}. It may have been deleted.`} />;
  if (query.isError) {
    return (
      <ErrorState title="Could not load this rank" error={query.error} onRetry={() => void query.refetch()} />
    );
  }
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">Loading the rank</span>
      <Skeleton width="40%" height={16} />
      <Skeleton />
      <Skeleton width="80%" />
    </div>
  );
}

/** The editor of the rank the address names, or a line saying there is none. */
export function EditRankView({ grants }: AccountsViewProps) {
  const [params] = useSearchParams();
  const id = rankIdOf(params.get('id'));
  if (id === null)
    return <NoRank detail="No rank is named in the address. Open one from the list to edit it." />;
  return <RankLoader key={id} id={id} grants={grants} />;
}
