// The form of the Profile part with its save. It sends only what changed, through the data layer's own mutation (so the same reads go stale
// and the same toast shows), and puts a refusal from the server under the box it names. After a save the form restarts from what the server
// answered, so it is clean again and the next save compares with what was just saved.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, toast, useReportDirty } from '@/components/ui';
import { useUpdateAccountDetails } from '../../hooks/useAccountMutations';
import type { AccountDetail } from '../../types';
import {
  PROFILE_FIELDS,
  profileBody,
  profileDefaults,
  type ProfileLocks,
  type ProfileValues,
} from './profileForm';

/**
 * The form for `account`, its `submit` (a PartForm `onSubmit`) and whether it holds unsaved changes. `onDirtyChange` is told whenever that
 * changes, and once with false when the form goes away. A save with nothing to send says "Nothing changed" and does not read as saved.
 *
 * @param account the record the form starts from
 * @param locks the fields this staff member may not change (they are never sent)
 * @param onDirtyChange the record's unsaved mark
 */
export function useProfileForm(
  account: AccountDetail,
  locks: ProfileLocks,
  onDirtyChange: (dirty: boolean) => void,
) {
  const update = useUpdateAccountDetails();
  // The account the next save compares with: the one the form opened on, then the one the server last returned.
  const [base, setBase] = useState(account);
  const form = useForm<ProfileValues>({ defaultValues: profileDefaults(account) });
  const { isDirty } = form.formState;
  useReportDirty(isDirty, onDirtyChange);

  const submit = dialogSubmit(
    form,
    async (values) => {
      const body = profileBody(base, values, locks);
      if (Object.keys(body).length === 0) {
        // Show the form as it was saved, so a stray space typed and removed does not keep it looking changed.
        form.reset(profileDefaults(base));
        toast({ kind: 'info', title: 'Nothing changed' });
        return false;
      }
      const updated = await update.mutateAsync({ account: base, body });
      setBase(updated);
      form.reset(profileDefaults(updated));
    },
    // A taken email belongs under the Email box, whether or not the problem names the field.
    { fields: PROFILE_FIELDS, codeFields: { EMAIL_TAKEN: 'email' } },
  );
  return { form, submit, dirty: isDirty };
}
