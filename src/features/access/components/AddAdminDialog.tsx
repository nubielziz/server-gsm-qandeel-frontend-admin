// AddAdminDialog: "Add an admin" (the demo's `ad-new` action): name, email, role, and how they get their first
// password. A temporary password is made by the server and shown once (see RevealPasswordDialog).
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  FormDialog,
  RadioGroup,
  SelectField,
  TextField,
  type RadioOption,
  dialogSubmit,
} from '@/components/ui';
import { useCreateStaff } from '../hooks/useStaffMutations';
import { describeRole } from '../lib/permissions';
import { cleanEmail, cleanName, defaultRoleId, validEmail } from '../lib/staffInput';
import type { CreateStaffResult, Role, StaffOnboarding } from '../types';

type Values = { name: string; email: string; roleId: string; onboarding: StaffOnboarding };
const FIELDS = ['name', 'email', 'roleId', 'onboarding'] as const;

const ONBOARDING: RadioOption[] = [
  {
    value: 'invite',
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

export interface AddAdminDialogProps {
  roles: readonly Role[];
  onClose: () => void;
  /** Called after the admin was added and the dialog closed, with the new account (and a temporary password, once). */
  onCreated: (created: CreateStaffResult) => void;
}

/**
 * The form behind "Add admin". It is mounted only while open, so every opening starts with empty fields;
 * the account it created is handed on after the dialog has closed.
 */
export function AddAdminDialog({ roles, onClose, onCreated }: AddAdminDialogProps) {
  const create = useCreateStaff();
  // The dialog closes itself after a successful save; this remembers what was created so `onClose` can hand it on.
  const created = useRef<CreateStaffResult | undefined>(undefined);
  const form = useForm<Values>({
    defaultValues: { name: '', email: '', roleId: defaultRoleId(roles), onboarding: 'invite' },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const role = roles.find((candidate) => String(candidate.id) === watch('roleId'));

  const submit = dialogSubmit(
    form,
    async (values) => {
      created.current = await create.mutateAsync({
        name: cleanName(values.name),
        email: cleanEmail(values.email),
        roleId: Number(values.roleId),
        onboarding: values.onboarding,
      });
    },
    { fields: FIELDS, codeFields: { EMAIL_TAKEN: 'email' } },
  );

  return (
    <FormDialog
      open
      title="Add an admin"
      sub="They get an account on this console. They set up 2FA the first time they sign in."
      confirm="Add admin"
      onClose={() => (created.current ? onCreated(created.current) : onClose())}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Full name"
          autoComplete="off"
          error={errors.name}
          {...register('name', { validate: (value) => cleanName(value).length >= 2 || 'Enter their name.' })}
        />
        <TextField
          label="Work email"
          type="text"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          placeholder="name@gsm-supply.example"
          hint="The invitation goes here."
          error={errors.email}
          {...register('email', { validate: (value) => validEmail(value) || 'Enter a valid email address.' })}
        />
        <SelectField
          label="Role"
          selectWrapClassName="w-full"
          options={[
            { value: '', label: 'Choose a role' },
            ...roles.map((item) => ({ value: String(item.id), label: item.name })),
          ]}
          // Without `roles:read` the list comes back empty; say why instead of failing on submit.
          hint={
            roles.length === 0
              ? 'No roles to choose from: listing roles needs the roles:read permission.'
              : role
                ? describeRole(role)
                : undefined
          }
          disabled={roles.length === 0}
          error={errors.roleId}
          {...register('roleId', { required: 'Choose a role.' })}
        />
        <RadioGroup legend="Password" options={ONBOARDING} {...register('onboarding')} />
      </div>
    </FormDialog>
  );
}
