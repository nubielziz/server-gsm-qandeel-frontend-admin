// ComposerBasics: section 1 of the composer: the campaign's name, its purpose (what the audience may be sent) and the channels.
import { CheckboxField, RadioGroup, TextField } from '@/components/ui';
import { CHANNEL_LABEL } from '../lib/status';
import { NAME_MAX, type ComposerForm, type Problems } from '../lib/spec';
import { CAMPAIGN_CHANNELS, type CampaignChannel, type CampaignPurpose } from '../types';

export interface ComposerBasicsProps {
  form: ComposerForm;
  onChange: (patch: Partial<ComposerForm>) => void;
  errors: Problems;
}

const PURPOSE_OPTIONS = [
  {
    value: 'service',
    label: 'Service announcement',
    description: 'Reaches every eligible person: maintenance, changes, things people need to know.',
  },
  {
    value: 'marketing',
    label: 'Marketing',
    description: 'Retail accounts and guests who did not agree to marketing are left out, on every channel.',
  },
];

const CHANNEL_HINT: Record<CampaignChannel, string> = {
  in_app: 'Shows in the bell of the console, the merchant portal or the shop account.',
  email: 'People who switched announcement emails off are left out.',
};

export function ComposerBasics({ form, onChange, errors }: ComposerBasicsProps) {
  const toggle = (channel: CampaignChannel, on: boolean) =>
    onChange({
      channels: on
        ? CAMPAIGN_CHANNELS.filter((candidate) => candidate === channel || form.channels.includes(candidate))
        : form.channels.filter((candidate) => candidate !== channel),
    });
  return (
    <section aria-label="Basics" className="space-y-4">
      <h3 className="text-sm font-semibold">1. Basics</h3>
      <TextField
        label="Name"
        hint="Only staff see the name."
        value={form.name}
        maxLength={NAME_MAX}
        error={errors.name}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <RadioGroup
        legend="Purpose"
        name="campaign-purpose"
        options={PURPOSE_OPTIONS}
        value={form.purpose}
        highlight
        error={errors.purpose}
        onChange={(event) => onChange({ purpose: event.target.value as CampaignPurpose })}
      />
      <fieldset className="min-w-0">
        <legend className="label">Channels</legend>
        <div className="space-y-2">
          {CAMPAIGN_CHANNELS.map((channel) => (
            <CheckboxField
              key={channel}
              label={CHANNEL_LABEL[channel]}
              hint={CHANNEL_HINT[channel]}
              align="start"
              checked={form.channels.includes(channel)}
              onChange={(event) => toggle(channel, event.target.checked)}
            />
          ))}
        </div>
        {errors.channels && <p className="mt-1 text-xs text-crit-fg">{errors.channels}</p>}
      </fieldset>
    </section>
  );
}
