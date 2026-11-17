// PublishBulkFactDialog: a small dialog with one field, to set the brand, the carrier or the country of the rows a bulk call
// reaches. An empty value clears the fact. The server recomputes the flags that follow from a fact and answers how many rows changed.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextField } from '@/components/ui';

/** The facts a bulk call can set, and what the dialog says for each. */
export const FACT_WORDS = {
  brand: {
    title: 'Set the brand',
    label: 'Brand',
    max: 80,
    hint: 'Up to 80 characters. Leave it empty to clear the brand.',
  },
  carrier: {
    title: 'Set the carrier',
    label: 'Carrier',
    max: 80,
    hint: 'Up to 80 characters. Leave it empty to clear the carrier.',
  },
  country: {
    title: 'Set the country',
    label: 'Country',
    max: 2,
    hint: 'Two letters, such as US. Leave it empty to clear the country.',
  },
} as const;
export type FactKey = keyof typeof FACT_WORDS;

export interface PublishBulkFactDialogProps {
  fact: FactKey;
  /** How many rows it reaches, for the line under the title. */
  rows: number;
  /** Sends the call; a refusal is thrown (an `ApiError`) so the dialog shows it under the field or in the error slot. */
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}

/** The dialog for one fact. */
export function PublishBulkFactDialog({ fact, rows, onSave, onClose }: PublishBulkFactDialogProps) {
  const words = FACT_WORDS[fact];
  const form = useForm<{ value: string }>({ defaultValues: { value: '' } });
  const submit = dialogSubmit(form, async ({ value }) => onSave(value.trim()), {
    fields: ['value'],
    // The server names the key of `set`; the form's field is `value`.
    aliases: { [fact]: 'value', [`set.${fact}`]: 'value' },
  });
  return (
    <FormDialog
      open
      title={words.title}
      sub={`${rows} ${rows === 1 ? 'row' : 'rows'}`}
      confirm="Set"
      onClose={onClose}
      onSubmit={submit}
    >
      <TextField
        label={words.label}
        hint={words.hint}
        autoComplete="off"
        autoFocus
        maxLength={words.max}
        error={form.formState.errors.value}
        {...form.register('value')}
      />
    </FormDialog>
  );
}
