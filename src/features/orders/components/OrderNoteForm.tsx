// OrderNoteForm: "Add a note" under the timeline (`POST /admin/orders/:id/notes`). The demo has no notes; the map adds them
// as internal timeline entries (MISMATCHES M31). A failed call shows under the box.
import { useForm } from 'react-hook-form';
import { Button, errorText, TextareaField } from '@/components/ui';
import { useAddOrderNote } from '../hooks/useOrderMutations';
import type { Order } from '../types';

type Values = { body: string };

export function OrderNoteForm({ order }: { order: Order }) {
  const add = useAddOrderNote();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues: { body: '' } });

  const submit = handleSubmit(async (values) => {
    try {
      await add.mutateAsync({ order, body: { body: values.body.trim() } });
      reset();
    } catch (error) {
      setError('body', { type: 'server', message: errorText(error) });
    }
  });

  return (
    <form className="mt-4" onSubmit={(event) => void submit(event)} noValidate>
      <TextareaField
        label="Add a note"
        rows={2}
        maxLength={500}
        hint="Only your team sees notes."
        error={errors.body}
        {...register('body', { validate: (value) => value.trim() !== '' || 'Write the note first.' })}
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" size="sm" loading={add.isPending}>
          Add note
        </Button>
      </div>
    </form>
  );
}
