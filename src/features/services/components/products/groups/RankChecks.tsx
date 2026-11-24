// RankChecks: the "Visible to" choice of a group: "All ranks" and one box per rank. None ticked means every rank, so "All ranks"
// is the state of an empty list: ticking a rank turns it off and ticking it again clears the ranks.
import { CheckboxField } from '@/components/ui';
import type { Id } from '@/lib/api';
import { toggleRank } from '../../../lib/categories';
import type { NamedRef } from '../../../types';

export interface RankChecksProps {
  /** The ranks that see the group; empty means every rank. */
  ids: readonly Id[];
  onChange: (ids: Id[]) => void;
  /** The ranks that can be chosen, in the server's order. */
  ranks: readonly NamedRef[];
}

/** "All ranks" is checked (and cannot be unchecked, there is nothing else to fall back to) while no rank is ticked. */
export function RankChecks({ ids, onChange, ranks }: RankChecksProps) {
  return (
    <div className="flex flex-col gap-1.5 pt-1.5">
      <CheckboxField
        label="All ranks"
        checked={ids.length === 0}
        disabled={ids.length === 0}
        onChange={() => onChange([])}
      />
      {ranks.map((rank) => (
        <CheckboxField
          key={rank.id}
          label={rank.name}
          checked={ids.includes(rank.id)}
          onChange={(event) => onChange(toggleRank(ids, rank.id, event.target.checked))}
        />
      ))}
    </div>
  );
}
