// CampaignContent: the message of a campaign as people will see it. English and Arabic tabs (Arabic says it falls back to English when it was not written),
// a channel switch (only the campaign's channels) and, when more than one kind of person is reached, whose sample to render. The server renders the preview
// with sample data (`POST .../:id/preview`); email HTML sits in the sandboxed frame of the settings feature, never in the page itself.
import { useState } from 'react';
import { ErrorState, Panel, SegmentedControl, SelectField, Skeleton, Tabs } from '@/components/ui';
import { PreviewFrame } from '@/features/settings';
import { useCampaignPreview } from '../hooks/useCampaignPreview';
import { CHANNEL_LABEL } from '../lib/status';
import type { CampaignChannel, CampaignDetail, CampaignLocale, PreviewAudience } from '../types';

const AUDIENCE_LABEL: Record<PreviewAudience, string> = {
  staff: 'Staff',
  merchant: 'Merchants',
  customer: 'Customers',
};

/** The kinds of people the campaign reaches, customers first (the server's default sample). */
function audiencesOf(campaign: CampaignDetail): PreviewAudience[] {
  const { audience } = campaign;
  const types = new Set((audience.include ?? []).map((person) => person.type));
  const found: PreviewAudience[] = [];
  if (audience.customers || types.has('customer')) found.push('customer');
  if (audience.merchants || types.has('client')) found.push('merchant');
  if (audience.staff || types.has('staff')) found.push('staff');
  return found.length > 0 ? found : ['customer'];
}

export function CampaignContent({ campaign }: { campaign: CampaignDetail }) {
  const [locale, setLocale] = useState<CampaignLocale>('en');
  const [channel, setChannel] = useState<CampaignChannel>(campaign.channels[0] ?? 'in_app');
  const audiences = audiencesOf(campaign);
  const [sample, setSample] = useState<PreviewAudience>(audiences[0]);
  const preview = useCampaignPreview(campaign.id, campaign.updatedAt, { locale, channel, audience: sample });
  const data = preview.data;
  const arabicMissing = locale === 'ar' && !campaign.content.ar;

  return (
    <Panel
      title="Message"
      sub="As the server renders it, with a sample name. Nothing is sent."
      right={
        <SegmentedControl
          label="Channel"
          items={campaign.channels.map((value) => ({ value, label: CHANNEL_LABEL[value] }))}
          value={channel}
          onChange={setChannel}
        />
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            label="Language of the preview"
            items={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
            value={locale}
            onChange={setLocale}
          />
          {audiences.length > 1 && (
            <SelectField
              aria-label="Sample for"
              value={sample}
              options={audiences.map((value) => ({
                value,
                label: `Sample for ${AUDIENCE_LABEL[value].toLowerCase()}`,
              }))}
              onChange={(event) => setSample(event.target.value as PreviewAudience)}
            />
          )}
        </div>
        {arabicMissing && (
          <p className="text-xs text-ink3">
            There is no Arabic text: people who read Arabic get the English one.
          </p>
        )}
        {preview.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : preview.isError ? (
          <ErrorState
            title="Could not render the preview"
            error={preview.error}
            onRetry={() => void preview.refetch()}
          />
        ) : data ? (
          <div className="rounded-lg border border-line">
            <div className="border-b border-line bg-sunken px-3.5 py-2 text-xs text-ink3">
              From {data.from}
              <br />
              {channel === 'email' ? 'Subject: ' : 'Title: '}
              <span className="text-ink">{data.subject}</span>
            </div>
            <div dir={locale === 'ar' ? 'rtl' : undefined} lang={locale}>
              <PreviewFrame preview={data} />
            </div>
            {data.note && <p className="border-t border-line px-3.5 py-2 text-xs text-ink3">{data.note}</p>}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
