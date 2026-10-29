// PasswordDialog: "Password for <name>" (the demo's `ad-pw` action): email a set-password link, or have the server make a
// temporary password, optionally signing them out everywhere. The old password is never shown.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField, FormDialog, RadioGroup, type RadioOption, dialogSubmit } from '@/components/ui';
import { useSetStaffPassword } from '../hooks/useStaffMutations';
import type { PasswordMode, StaffMember, StaffPasswordResult } from '../types';

type Values = { mode: PasswordMode; revokeSessions: boolean };

const MODES: RadioOption[] = [
  {
    value: 'reset_link',
    label: 'Email a link to choose it',
    description:
      'They pick the password and you never see it. The link works for 1 hour. This is the safer choice.',
  },
  {
    value: 'temporary_password',
    label: 'Set a temporary password now',
    description:
      'We make one up and show it to you once. They must change it the first time they sign in. Send it to them over a private channel.',
  },
];

export interface PasswordDialogProps {
  staff: StaffMember;
  onClose: () => void;
  /** Called after the dialog closed when the server made a temporary password, so it can be shown once. */
  onReveal: (name: string, password: string) => void;
}

/**
 * Replaces an admin's password. A temporary password comes back once and is passed on to the one-time
 * dialog after this one closes.
 */
export function PasswordDialog({ staff, onClose, onReveal }: PasswordDialogProps) {
  const setPassword = useSetStaffPassword();
  const revealed = useRef<string | undefined>(undefined);
  const form = useForm<Values>({ defaultValues: { mode: 'reset_link', revokeSessions: true } });
  const { register } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const result = (await setPassword.mutateAsync({ staff, body: values })) as
        StaffPasswordResult | undefined;
      revealed.current = result?.temporaryPassword;
    },
    { fields: ['mode', 'revokeSessions'] },
  );

  return (
    <FormDialog
      open
      title={`Password for ${staff.name}`}
      sub="You can replace it but never read it."
      confirm="Continue"
      onClose={() => (revealed.current ? onReveal(staff.name, revealed.current) : onClose())}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <RadioGroup legend="Password" options={MODES} {...register('mode')} />
        <CheckboxField label="Sign them out of every device" {...register('revokeSessions')} />
      </div>
    </FormDialog>
  );
}
