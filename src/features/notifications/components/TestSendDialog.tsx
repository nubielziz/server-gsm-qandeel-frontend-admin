// TestSendDialog: sends the campaign to the signed-in staff member only, to see it before everyone does: an in-app item, an email, or both.
// The campaign itself does not change.
import { useState } from 'react';
import { CheckboxField, FormDialog } from '@/components/ui';
import { useSendTest } from '../hooks/useCampaignMutations';
import type { CampaignDetail } from '../types';

type TestChannel = 'in_app' | 'email';

export function TestSendDialog({ campaign, onClose }: { campaign: CampaignDetail; onClose: () => void }) {
  const send = useSendTest();
  const [channels, setChannels] = useState<TestChannel[]>(['in_app', 'email']);
  const toggle = (channel: TestChannel, on: boolean) =>
    setChannels((prev) => (on ? [...prev, channel] : prev.filter((candidate) => candidate !== channel)));

  async function submit() {
    if (channels.length === 0) return 'Choose at least one channel.';
    await send.mutateAsync({ id: campaign.id, body: { channels } });
  }

  return (
    <FormDialog
      open
      title="Send a test to yourself"
      sub={campaign.name}
      confirm="Send test"
      onClose={onClose}
      onSubmit={submit}
    >
      <fieldset>
        <legend className="label">Channels</legend>
        <div className="space-y-1.5">
          <CheckboxField
            label="In-app (the bell of the console)"
            checked={channels.includes('in_app')}
            onChange={(event) => toggle('in_app', event.target.checked)}
          />
          <CheckboxField
            label="Email (to your own address)"
            checked={channels.includes('email')}
            onChange={(event) => toggle('email', event.target.checked)}
          />
        </div>
      </fieldset>
    </FormDialog>
  );
}
