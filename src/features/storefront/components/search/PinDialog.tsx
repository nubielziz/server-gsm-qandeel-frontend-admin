// PinDialog: "Add pinned results" and "Edit pinned results" (`POST` and `PATCH /admin/search/pins`): for searches that match some
// words, put chosen services first at fixed positions and keep others out, between optional dates. The checks here only save a
// round trip; the server cleans the query, refuses a service that is not listed (422, shown on its row) and a rule
// for a query that already has one (409). The Report tab opens it with a query filled in.
import { useController, useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, RadioGroup, TextField, toast } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useCreatePin, useUpdatePin } from '../../hooks/useSearchMutations';
import { changedPinFields, createPinBody, type PinFormValues } from '../../lib/pinForm';
import { fromInputValue, MAX_QUERY_LENGTH, normaliseTerm, toInputValue } from '../../lib/search';
import type { SearchPin } from '../../types';
import { PinServicesField } from './PinServicesField';

export interface PinDialogProps {
  /** The rule to edit; leave out to add one. */
  pin?: SearchPin;
  /** The words to start the new rule with (from a no-result search in the report). */
  initialQuery?: string;
  onClose: () => void;
}

const MATCH_OPTIONS = [
  {
    value: 'contains',
    label: 'Any search that contains these words',
    description: 'Also "unlock iphone" for "unlock".',
  },
  { value: 'exact', label: 'Only this exact search', description: 'Just "unlock", nothing around it.' },
];

/** Adds a pinned-results rule, or edits the one it is given. */
export function PinDialog({ pin, initialQuery, onClose }: PinDialogProps) {
  const create = useCreatePin();
  const update = useUpdatePin();
  const form = useForm<PinFormValues>({
    defaultValues: {
      query: pin?.query ?? (initialQuery ? normaliseTerm(initialQuery) : ''),
      match: pin?.match ?? 'contains',
      pinned: pin?.pinned ?? [],
      hidden: pin?.hidden ?? [],
      startsAt: toInputValue(pin?.startsAt ?? null),
      endsAt: toInputValue(pin?.endsAt ?? null),
      note: pin?.note ?? '',
      isEnabled: pin?.isEnabled ?? true,
    },
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const pinned = useController({
    control,
    name: 'pinned',
    rules: {
      validate: (value, all) => {
        if (new Set(value.map((item) => item.position)).size !== value.length)
          return 'Each pinned service needs its own position.';
        return value.length + all.hidden.length > 0 || 'Pin or hide at least one service.';
      },
    },
  });
  const hidden = useController({ control, name: 'hidden' });

  const submit = dialogSubmit(
    form,
    async (values) => {
      if (!pin) {
        await create.mutateAsync(createPinBody(values));
        return;
      }
      const body = changedPinFields(values, pin);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ pin, body });
    },
    { fields: ['query', 'match', 'pinned', 'hidden', 'startsAt', 'endsAt', 'note', 'isEnabled'] },
  );

  return (
    <FormDialog
      open
      size="lg"
      title={pin ? 'Edit pinned results' : 'Add pinned results'}
      sub={
        pin
          ? `Created ${fmtDate(pin.createdAt)}, last changed ${fmtDate(pin.updatedAt)}. Changes reach the shop within a minute.`
          : 'Changes reach the shop within a minute. Use Test a search above the table to check a rule.'
      }
      confirm={pin ? 'Save changes' : 'Save rule'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <TextField
          label="When a visitor searches for"
          autoComplete="off"
          autoFocus
          hint="Words as visitors type them, such as unlock. Saved in lower case."
          error={errors.query}
          {...register('query', {
            validate: (value) => {
              const words = normaliseTerm(value);
              if (words === '') return 'Enter the search words.';
              return words.length <= MAX_QUERY_LENGTH || `Use at most ${MAX_QUERY_LENGTH} characters.`;
            },
          })}
        />
        <RadioGroup legend="It applies to" options={MATCH_OPTIONS} {...register('match')} highlight />
        <PinServicesField
          pinned={pinned.field.value}
          hidden={hidden.field.value}
          onPinnedChange={pinned.field.onChange}
          onHiddenChange={hidden.field.onChange}
          pinnedError={errors.pinned}
          hiddenError={errors.hidden}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Starts (optional)"
            type="datetime-local"
            hint="Your time zone. Empty means now."
            error={errors.startsAt}
            {...register('startsAt')}
          />
          <TextField
            label="Ends (optional)"
            type="datetime-local"
            hint="Empty means until you remove the rule."
            error={errors.endsAt}
            {...register('endsAt', {
              validate: (value, all) => {
                const start = fromInputValue(all.startsAt);
                const end = fromInputValue(value);
                return !start || !end || end > start || 'The end must come after the start.';
              },
            })}
          />
        </div>
        <TextField
          label="Why (optional)"
          autoComplete="off"
          hint="A line for the next person who edits this rule. Every change is also written to the audit log."
          error={errors.note}
          {...register('note')}
        />
        <CheckboxField label="On: the shop uses this rule" {...register('isEnabled')} />
      </div>
    </FormDialog>
  );
}
