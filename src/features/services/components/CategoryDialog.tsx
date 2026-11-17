// CategoryDialog: "New category" and "Edit category" (`POST` and `PATCH /admin/service-categories`): a name, the kind of services it
// holds, the merchant groups that can see it (none ticked means every group), its position and whether it is shown. The demo had no
// category screen (categories were only a column of the service table); the map adds this tab. Only what changed is sent on an edit.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, SelectField, TextField, toast } from '@/components/ui';
import { useGroupOptions } from '../hooks/useChoices';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { useCreateCategory, useUpdateCategory } from '../hooks/useCategoryMutations';
import { sameIds } from '../lib/categories';
import { TYPE_OPTIONS } from '../lib/status';
import type { ServiceCategory, ServiceType, UpdateCategoryBody } from '../types';
import { LookupNote } from './LookupNote';

type Values = { name: string; type: ServiceType; sort: string; isActive: boolean };

export interface CategoryDialogProps {
  /** The category to edit; leave out to create one. */
  category?: ServiceCategory;
  onClose: () => void;
}

/** Creates a category, or edits the one it is given. */
export function CategoryDialog({ category, onClose }: CategoryDialogProps) {
  const grants = useServiceGrants();
  const canGroups = grants.can('groups:read');
  const groups = useGroupOptions(canGroups);
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [groupIds, setGroupIds] = useState<number[]>(category?.allowedGroupIds ?? []);
  const form = useForm<Values>({
    defaultValues: {
      name: category?.name ?? '',
      type: category?.type ?? 'imei',
      sort: String(category?.sort ?? 0),
      isActive: category?.isActive ?? true,
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = {
        name: values.name.trim(),
        type: values.type,
        allowedGroupIds: groupIds,
        sort: Number(values.sort),
        isActive: values.isActive,
      };
      if (!category) {
        await create.mutateAsync(next);
        return;
      }
      const body: UpdateCategoryBody = {};
      if (next.name !== category.name) body.name = next.name;
      if (next.type !== category.type) body.type = next.type;
      if (!sameIds(next.allowedGroupIds, category.allowedGroupIds))
        body.allowedGroupIds = next.allowedGroupIds;
      if (next.sort !== category.sort) body.sort = next.sort;
      if (next.isActive !== category.isActive) body.isActive = next.isActive;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ category, body });
    },
    // `allowedGroupIds` is not a form field (the ticks are state), so a message about it falls to the dialog's error slot.
    { fields: ['name', 'type', 'sort', 'isActive'] },
  );

  return (
    <FormDialog
      open
      title={category ? `Edit ${category.name}` : 'New category'}
      sub="Categories group services in the catalog and decide which merchant groups can see them."
      confirm={category ? 'Save changes' : 'Create category'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="Name"
          autoComplete="off"
          maxLength={80}
          autoFocus
          error={errors.name}
          {...register('name', { validate: (value) => value.trim() !== '' || 'Enter a name.' })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Type"
            selectWrapClassName="w-full"
            options={TYPE_OPTIONS}
            error={errors.type}
            {...register('type')}
          />
          <TextField
            label="Position"
            inputMode="numeric"
            autoComplete="off"
            hint="Lower numbers come first."
            error={errors.sort}
            {...register('sort', {
              validate: (value) => /^\d+$/.test(value.trim()) || 'Enter a whole number.',
            })}
          />
        </div>
        <fieldset className="min-w-0">
          <legend className="label">Visible to</legend>
          {canGroups ? (
            <div className="space-y-1.5">
              <LookupNote what="merchant groups" query={groups} />
              {(groups.data ?? []).map((group) => (
                <CheckboxField
                  key={group.id}
                  label={group.name}
                  checked={groupIds.includes(group.id)}
                  onChange={(event) =>
                    setGroupIds((current) =>
                      event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id),
                    )
                  }
                />
              ))}
              <p className="hint">
                {groups.isError
                  ? 'The category keeps the groups it has now.'
                  : 'Leave all unticked to show the category to every group.'}
              </p>
            </div>
          ) : (
            <p className="hint">
              You need the groups:read permission to choose groups. The category keeps the groups it has now.
            </p>
          )}
        </fieldset>
        <CheckboxField label="Shown to merchants" error={errors.isActive} {...register('isActive')} />
      </div>
    </FormDialog>
  );
}
