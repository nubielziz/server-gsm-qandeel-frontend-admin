// EditAdminDialog: "Edit <name>" (the demo's `ad-edit` action): name, email and role. The role is locked, with the reason
// shown, for your own account and for the last active Owner. Nothing is sent when nothing changed.
import { useForm } from 'react-hook-form';
import { FormDialog, SelectField, TextField, toast, dialogSubmit } from '@/components/ui';
import { useUpdateStaff } from '../hooks/useStaffMutations';
import type { Guard } from '../lib/ipGuards';
import { describeRole } from '../lib/permissions';
import { changedFields, cleanName, validEmail } from '../lib/staffInput';
import type { Role, StaffMember } from '../types';

type Values = { name: string; email: string; roleId: string };
const FIELDS = ['name', 'email', 'roleId'] as const;

export interface EditAdminDialogProps {
  staff: StaffMember;
  roles: readonly Role[];
  /** Whether the role may change; when not, `reason` is shown under the role field. */
  roleGuard: Guard;
  onClose: () => void;
}

/**
 * The form for editing an admin. It sends only the fields that changed, and nothing at all when none did.
 */
export function EditAdminDialog({ staff, roles, roleGuard, onClose }: EditAdminDialogProps) {
  const update = useUpdateStaff();
  const form = useForm<Values>({
    defaultValues: { name: staff.name, email: staff.email, roleId: String(staff.role.id) },
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
      const body = changedFields(staff, values, roleGuard.ok);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ staff, body });
    },
    { fields: FIELDS, codeFields: { EMAIL_TAKEN: 'email' } },
  );

  // A role the list does not offer (roles could not be loaded) still shows, so the field is never blank.
  const offered = roles.map((item) => ({ value: String(item.id), label: item.name }));
  const options = offered.some((option) => option.value === String(staff.role.id))
    ? offered
    : [{ value: String(staff.role.id), label: staff.role.name }, ...offered];

  return (
    <FormDialog
      open
      title={`Edit ${staff.name}`}
      sub="Changes are written to the audit log."
      confirm="Save changes"
      onClose={onClose}
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
          error={errors.email}
          {...register('email', { validate: (value) => validEmail(value) || 'Enter a valid email address.' })}
        />
        <SelectField
          label="Role"
          selectWrapClassName="w-full"
          options={options}
          disabled={!roleGuard.ok}
          hint={roleGuard.ok ? (role ? describeRole(role) : undefined) : roleGuard.reason}
          error={errors.roleId}
          {...register('roleId')}
        />
      </div>
    </FormDialog>
  );
}
