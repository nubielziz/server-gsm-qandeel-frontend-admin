// ScheduleCampaignDialog: picks the time a campaign goes out (a native `datetime-local`, in the staff member's time zone, shown beside it). The earliest time
// is two minutes from now, the latest 90 days; the server checks again (422 on `scheduledAt`, or on `audience` when nobody can be reached).
import { useState } from 'react';
import { FormDialog, TextField } from '@/components/ui';
import { isApiError } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { useScheduleCampaign } from '../hooks/useCampaignMutations';
import {
  maxLocalValue,
  minLocalValue,
  scheduleHint,
  timeZoneLabel,
  toLocalInputValue,
  toScheduledAt,
} from '../lib/schedule';
import type { CampaignDetail } from '../types';

export function ScheduleCampaignDialog({
  campaign,
  onClose,
}: {
  campaign: CampaignDetail;
  onClose: () => void;
}) {
  const schedule = useScheduleCampaign();
  const [now] = useState(() => Date.now());
  const [value, setValue] = useState(() =>
    campaign.scheduledAt ? toLocalInputValue(Date.parse(campaign.scheduledAt)) : '',
  );
  const [problem, setProblem] = useState<string>();
  const rescheduling = campaign.status === 'scheduled';

  async function submit() {
    const hint = scheduleHint(value, now);
    if (hint) {
      setProblem(hint);
      return false;
    }
    try {
      await schedule.mutateAsync({ id: campaign.id, body: { scheduledAt: toScheduledAt(value) as string } });
    } catch (error) {
      // The server names the field: a time problem goes under the input, anything else shows in the dialog.
      if (isApiError(error) && error.fieldErrors.scheduledAt) {
        setProblem(error.fieldErrors.scheduledAt.join(' '));
        return false;
      }
      throw error;
    }
  }

  return (
    <FormDialog
      open
      title={rescheduling ? 'Reschedule campaign' : 'Schedule campaign'}
      sub={campaign.name}
      confirm={rescheduling ? 'Reschedule' : 'Schedule'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Send at"
          type="datetime-local"
          value={value}
          min={minLocalValue(now)}
          max={maxLocalValue(now)}
          error={problem}
          hint={`Your time zone: ${timeZoneLabel()}. It goes out within a minute of this time.`}
          onChange={(event) => {
            setValue(event.target.value);
            setProblem(undefined);
          }}
        />
        {rescheduling && campaign.scheduledAt && (
          <p className="text-xs text-ink3">Now set for {fmtDate(campaign.scheduledAt)}.</p>
        )}
      </div>
    </FormDialog>
  );
}
