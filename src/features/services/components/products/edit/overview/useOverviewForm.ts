// The form of the Overview part with its save. It sends only what changed, through the same mutation as the old edit dialog (so the same
// reads go stale and the same toast shows), and puts a refusal from the server under the row it names. After a save the form is reset to
// what the server answered, so it is clean again and the next save compares with what was just saved.
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, toast } from '@/components/ui';
import { useUpdateService } from '../../../../hooks/useServiceMutations';
import type { Service } from '../../../../types';
import {
  OVERVIEW_ALIASES,
  OVERVIEW_FIELDS,
  overviewBody,
  overviewDefaults,
  type OverviewValues,
} from './overviewForm';

/**
 * The form for `service`, its `submit` (a PartForm `onSubmit`) and whether it holds unsaved changes. `onDirtyChange` is told whenever that
 * changes, and once with false when the form goes away. A save that has nothing to send says "Nothing changed" and does not read as saved.
 */
export function useOverviewForm(service: Service, onDirtyChange: (dirty: boolean) => void) {
  const update = useUpdateService();
  // The service the next save compares with: the one the form opened on, then the one the server last returned.
  const [base, setBase] = useState(service);
  const form = useForm<OverviewValues>({ defaultValues: overviewDefaults(service) });
  const { isDirty } = form.formState;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = overviewBody(values, base);
      if (Object.keys(body).length === 0) {
        // Show the form as it was saved, so a stray space typed and removed does not keep it looking changed.
        form.reset(overviewDefaults(base));
        toast({ kind: 'info', title: 'Nothing changed' });
        return false;
      }
      const updated = await update.mutateAsync({ service: base, body });
      setBase(updated);
      form.reset(overviewDefaults(updated));
    },
    { fields: OVERVIEW_FIELDS, aliases: OVERVIEW_ALIASES },
  );
  return { form, submit, dirty: isDirty };
}
