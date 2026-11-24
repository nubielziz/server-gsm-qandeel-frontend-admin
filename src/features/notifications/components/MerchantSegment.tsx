// MerchantSegment: the merchant group of the audience: the active accounts that hold a merchant rank, narrowed by rank and country. Ranks come from
// `GET /admin/client-groups` (the merchant ones); there is no status choice, because only active accounts are ever reached. Countries are typed as ISO
// codes and checked here before the server checks them again.
import { TextField } from '@/components/ui';
import { useRankOptions } from '../hooks/useAudienceOptions';
import { messagesUnder } from '../lib/serverErrors';
import { CheckList } from './CheckList';
import { SegmentCard } from './SegmentCard';
import type { SegmentProps } from './StaffSegment';

export function MerchantSegment({ audience, onChange, grants, errors }: SegmentProps) {
  const { merchants } = audience;
  const canRead = grants.can('groups:read');
  const ranks = useRankOptions(merchants.on && canRead);
  const patch = (change: Partial<typeof merchants>) =>
    onChange({ ...audience, merchants: { ...merchants, ...change } });
  return (
    <SegmentCard
      title="Merchants"
      description="Active accounts that hold a merchant rank, by rank and country."
      on={merchants.on}
      onToggle={(on) => patch({ on })}
    >
      <CheckList
        legend="Only these ranks"
        options={ranks.options.map((rank) => ({ value: rank.id, label: rank.name }))}
        selected={merchants.groupIds}
        emptyMeans="Every merchant rank."
        unavailable={
          !canRead
            ? 'You need the groups:read permission to pick ranks. Without it, every merchant rank is included.'
            : ranks.query.isError
              ? 'Could not load the ranks.'
              : undefined
        }
        onChange={(groupIds) => patch({ groupIds })}
      />
      <TextField
        label="Countries"
        hint="Two-letter codes separated by commas, such as JO, SA. Leave empty for every country."
        value={merchants.countries}
        error={messagesUnder(errors, 'audience.merchants.countries')}
        onChange={(event) => patch({ countries: event.target.value })}
      />
    </SegmentCard>
  );
}
