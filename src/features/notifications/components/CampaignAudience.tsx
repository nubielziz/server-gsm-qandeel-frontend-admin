// CampaignAudience: who the campaign is for, in words (one line per group, roles and groups by name when the staff member may read them), the link of
// the notification, and the people the fan-out skipped and why.
import { KeyValue, Panel } from '@/components/ui';
import { namesOf, useRankOptions, useRoleOptions } from '../hooks/useAudienceOptions';
import type { BroadcastGrants } from '../hooks/useBroadcastGrants';
import { audienceLines, skippedLines } from '../lib/audienceText';
import type { CampaignDetail } from '../types';

export function CampaignAudience({
  campaign,
  grants,
}: {
  campaign: CampaignDetail;
  grants: BroadcastGrants;
}) {
  const { audience } = campaign;
  const roles = useRoleOptions(Boolean(audience.staff?.roleIds?.length) && grants.can('roles:read'));
  const ranks = useRankOptions(Boolean(audience.merchants?.groupIds?.length) && grants.can('groups:read'));
  const lines = audienceLines(audience, { roles: namesOf(roles.options), groups: namesOf(ranks.options) });
  const skipped = skippedLines(campaign.skipped);
  const links = (['staff', 'merchant', 'customer'] as const)
    .filter((key) => campaign.link?.[key])
    .map(
      (key) =>
        [
          `Link for ${key === 'merchant' ? 'merchants' : key === 'staff' ? 'staff' : 'retail accounts'}`,
          <span key={key} className="mono">
            {campaign.link?.[key]}
          </span>,
        ] as const,
    );
  return (
    <Panel title="Audience">
      <KeyValue rows={[...lines.map((line) => [line.label, line.text] as const), ...links]} />
      {skipped.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-sm font-medium">Skipped</p>
          <ul className="mt-1 list-disc space-y-0.5 ps-5 text-sm text-ink2">
            {skipped.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
