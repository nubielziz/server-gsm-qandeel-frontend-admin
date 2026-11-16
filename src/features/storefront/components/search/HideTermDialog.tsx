// HideTermDialog: "Hide from popular searches" (`POST /admin/search/hidden-terms`): keeps one search term out of the list shown under
// an empty search box. The term is still searched normally. The reason is optional and kept with the entry. New in the Search tab.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextField } from '@/components/ui';
import { useHideTerm } from '../../hooks/useSearchMutations';

export interface HideTermDialogProps {
  term: string;
  onClose: () => void;
}

/** Hides the term it is given. A term that is already hidden is refused by the server and the message shows in the dialog. */
export function HideTermDialog({ term, onClose }: HideTermDialogProps) {
  const hide = useHideTerm();
  const form = useForm<{ note: string }>({ defaultValues: { note: '' } });
  const submit = dialogSubmit(
    form,
    async (values) => {
      const note = values.note.trim();
      await hide.mutateAsync({ term, ...(note ? { note } : {}) });
    },
    { fields: ['note'] },
  );

  return (
    <FormDialog
      open
      title="Hide from popular searches"
      sub="The term is still searched as before. It only stops showing under the empty search box."
      confirm="Hide term"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <p className="text-sm">
          Term: <span className="mono font-medium">{term}</span>
        </p>
        <TextField
          label="Why (optional)"
          autoComplete="off"
          autoFocus
          hint="Kept with the entry. Every change is also written to the audit log."
          error={form.formState.errors.note}
          {...form.register('note')}
        />
      </div>
    </FormDialog>
  );
}
