// GroupForm: the label-left form of a group, shared by Add Group and Edit Group: Group Name, Active (Yes | No) and Visible to (ranks), with its own
// heading and one primary button in the pinned bar. The server's messages for a field land under that field; any other goes beside the button.
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, FormRow, PinnedBar, SectionHeading, TextField, YesNo } from '@/components/ui';
import { applyServerErrors } from '@/lib/api';
import { useGroupOptions } from '../../../hooks/useChoices';
import type { GroupValues } from '../../../lib/groupForm';
import { LookupNote } from '../../LookupNote';
import { RankChecks } from './RankChecks';

/** What a control needs to be locked: the permission it lacks, in words. */
export type GroupFormLock = { disabled: boolean; title?: string };

export interface GroupFormProps {
  /** The heading above the rows: "Add Service Group". */
  heading: string;
  /** The words on the button: "Add" or "Save". */
  submitLabel: string;
  /** What the form starts with (the group's own values when it edits one). */
  initial: GroupValues;
  /** Keeps the rows and the button off for a role that may not save, and says why beside the button. */
  lock: GroupFormLock;
  /** Whether the ranks can be read (`groups:read`); without it the choice is not offered. */
  canRanks: boolean;
  /** What happens to the ranks when they cannot be chosen: "A new group is visible to every rank." */
  withoutRanks: string;
  /**
   * Saves the values. It may throw (an ApiError is placed on its fields). Resolve with the values the form should show from now on
   * (what the server saved) to start from them; resolve with nothing to leave the form as it is.
   */
  onSubmit: (values: GroupValues) => Promise<GroupValues | void>;
}

/** The view is a form that is the `view-frame`, so a short form still ends with its pinned bar at the foot of the window. */
export function GroupForm({
  heading,
  submitLabel,
  initial,
  lock,
  canRanks,
  withoutRanks,
  onSubmit,
}: GroupFormProps) {
  const activeId = useId();
  const ranks = useGroupOptions(canRanks);
  const form = useForm<GroupValues>({ defaultValues: initial });
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = form;
  const [failure, setFailure] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const saved = await onSubmit(values);
      if (saved) reset(saved);
    } catch (error) {
      const rest = applyServerErrors(error, setError, { fields: ['name', 'isActive', 'allowedGroupIds'] });
      setFailure(rest.length > 0 ? rest.join(' ') : null);
    }
  });

  return (
    <form noValidate className="view-frame" onSubmit={submit}>
      <div>
        <SectionHeading>{heading}</SectionHeading>
        <fieldset disabled={lock.disabled} className="m-0 min-w-0 border-0 p-0">
          <TextField
            layout="row"
            label="Group Name"
            required
            autoComplete="off"
            maxLength={80}
            error={errors.name}
            {...register('name', { validate: (value) => value.trim() !== '' || 'Enter a name.' })}
          />
          <FormRow label="Active" htmlFor={activeId} error={errors.isActive?.message}>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <YesNo id={activeId} value={field.value} onChange={field.onChange} />}
            />
          </FormRow>
          <FormRow
            label="Visible to"
            error={errors.allowedGroupIds?.message}
            hint={
              !canRanks
                ? `You need the groups:read permission to choose ranks. ${withoutRanks}`
                : ranks.isError
                  ? withoutRanks
                  : 'Tick ranks to limit who sees the group. With none ticked, every rank sees it.'
            }
          >
            {canRanks && (
              <>
                <LookupNote what="merchant ranks" query={ranks} />
                {ranks.isLoading && (
                  <span role="status" className="text-xs text-ink3">
                    Loading ranks…
                  </span>
                )}
                {/* A rank list that failed to load is not drawn, so "All ranks" cannot wipe the ranks the group has. */}
                {ranks.data && (
                  <Controller
                    control={control}
                    name="allowedGroupIds"
                    render={({ field }) => (
                      <RankChecks ids={field.value} onChange={field.onChange} ranks={ranks.data} />
                    )}
                  />
                )}
              </>
            )}
          </FormRow>
        </fieldset>
      </div>
      <PinnedBar>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={lock.disabled}
          title={lock.title}
        >
          {submitLabel}
        </Button>
        {lock.disabled && lock.title && <span className="text-xs text-ink3">{lock.title}</span>}
        {/* Always in the DOM, so a screen reader announces the text when it appears. */}
        <p className={failure ? 'text-sm text-crit-fg' : 'hidden'} role="alert">
          {failure}
        </p>
      </PinnedBar>
    </form>
  );
}
