// PublishConfirmDialog: the last look before publishing: how many services go on the shop at the prices shown, how many stay out,
// what happens to a price whose cost moved, and the choice to put them on the shop at once or create them switched off. Above 500
// services a tick box must be ticked first (Quick add's rule). A refusal of the server stays in the dialog in its words; a 409
// makes the page read the run again.
import { useState } from 'react';
import { CheckboxField, FormDialog, RadioGroup } from '@/components/ui';
import { useApplyPublishRun, useRereadPublishRun } from '../../hooks/usePublishMutations';
import { CONFIRM_ABOVE, isConflict, refusalText, servicesText } from '../../lib/publish';
import type { PublishRun } from '../../types';

export interface PublishConfirmDialogProps {
  run: PublishRun;
  onClose: () => void;
}

/** "Publish 30 services?" with the lines the plan says, the On the shop choice and (above 500) the tick box. */
export function PublishConfirmDialog({ run, onClose }: PublishConfirmDialogProps) {
  const apply = useApplyPublishRun();
  const reread = useRereadPublishRun();
  const [where, setWhere] = useState<'now' | 'off'>(run.listed ? 'now' : 'off');
  const [checked, setChecked] = useState(false);
  const included = run.counts.included;
  const stay = Math.max(0, run.total - included);
  const needsTick = included > CONFIRM_ABOVE;

  const publish = async () => {
    if (needsTick && !checked) return 'Tick the box to say you checked the preview.';
    try {
      await apply.mutateAsync({ id: run.id, body: { listed: where === 'now' } });
    } catch (failure) {
      if (isConflict(failure)) reread(run.id);
      return refusalText(failure);
    }
  };

  return (
    <FormDialog
      open
      title={`Publish ${servicesText(included)}?`}
      sub={`Run ${run.id}`}
      confirm={`Publish ${servicesText(included)}`}
      onClose={onClose}
      onSubmit={publish}
    >
      <div className="space-y-3 text-sm text-ink2">
        <p>
          {where === 'now'
            ? `This puts ${servicesText(included)} on the shop at the prices shown.`
            : `This creates ${servicesText(included)} switched off, at the prices shown.`}
        </p>
        <ul className="list-disc space-y-1 ps-5">
          {stay > 0 && (
            <li>
              {stay} {stay === 1 ? 'stays' : 'stay'} out: {stay === 1 ? 'it needs' : 'they need'} a look or{' '}
              cannot be published.
            </li>
          )}
          <li>
            Prices are worked out again when each service is published: a price follows its rule if the cost
            changed a little since this preview, and a service whose cost changed a lot is left out for you to
            check.
          </li>
          <li>You can take them off the shop again with one button.</li>
        </ul>
        <RadioGroup
          legend="On the shop"
          name="listed"
          value={where}
          onChange={(event) => setWhere(event.target.value === 'off' ? 'off' : 'now')}
          options={[
            { value: 'now', label: 'At once' },
            { value: 'off', label: 'Create them switched off' },
          ]}
        />
        {needsTick && (
          <CheckboxField
            label={`I checked the preview. Publish ${servicesText(included)}.`}
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
        )}
      </div>
    </FormDialog>
  );
}
