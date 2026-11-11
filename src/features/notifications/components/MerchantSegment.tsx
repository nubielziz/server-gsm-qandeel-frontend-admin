// MerchantSegment: the merchant group of the audience: active merchants (pending ones on request), narrowed by group and country. Groups come from
// `GET /admin/client-groups`; countries are typed as ISO codes and checked here before the server checks them again.
import { CheckboxField, TextField } from '@/components/ui';
import { useGroupOptions } from '../hooks/useAudienceOptions';
import { messagesUnder } from '../lib/serverErrors';
import type { MerchantStatus } from '../lib/spec';
import { CheckList } from './CheckList';
import { SegmentCard } from './SegmentCard';
import type { SegmentProps } from './StaffSegment';

export function MerchantSegment({ audience, onChange, grants, errors }: SegmentProps) {
  const { merchants } = audience;
  const canRead = grants.can('groups:read');
  const groups = useGroupOptions(merchants.on && canRead);
  const patch = (change: Partial<typeof merchants>) =>
    onChange({ ...audience, merchants: { ...merchants, ...change } });
  const toggleStatus = (status: MerchantStatus, on: boolean) =>
    patch({
      statuses: on
        ? [...merchants.statuses, status]
        : merchants.statuses.filter((candidate) => candidate !== status),
    });
  return (
    <SegmentCard
      title="Merchants"
      description="Merchants of the portal, by status, group and country."
      on={merchants.on}
      onToggle={(on) => patch({ on })}
    >
      <fieldset className="min-w-0">
        <legend className="label">Status</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <CheckboxField
            label="Active"
            checked={merchants.statuses.includes('active')}
            onChange={(event) => toggleStatus('active', event.target.checked)}
          />
          <CheckboxField
            label="Pending approval"
            checked={merchants.statuses.includes('pending')}
            onChange={(event) => toggleStatus('pending', event.target.checked)}
          />
        </div>
        {errors['audience.merchants.statuses'] && (
          <p className="mt-1 text-xs text-crit-fg">{errors['audience.merchants.statuses']}</p>
        )}
      </fieldset>
      <CheckList
        legend="Only these groups"
        options={groups.options.map((group) => ({ value: group.id, label: group.name }))}
        selected={merchants.groupIds}
        emptyMeans="Every group."
        unavailable={
          !canRead
            ? 'You need the groups:read permission to pick groups. Without it, every group is included.'
            : groups.query.isError
              ? 'Could not load the groups.'
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
