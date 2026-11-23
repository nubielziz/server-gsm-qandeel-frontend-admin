// ServiceGroupRow: "Service Listed In Group" of the +Add Service form: the menu of the groups of the kind and the link "Add New Group" (the
// +Add Group view). The server refuses a group of another kind, so the menu never offers one.
import { useId } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router';
import { FormRow, SelectField } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import { useCategories } from '../../../hooks/useChoices';
import { withChosen } from '../../../lib/select';
import { LookupNote } from '../../LookupNote';
import type { AddServiceValues } from './addServiceForm';
import { fieldWiring } from './fieldWiring';
import { addGroupFromAddPath, saveAddDraft } from './groupHandoff';

export interface ServiceGroupRowProps {
  form: UseFormReturn<AddServiceValues>;
  type: ServiceType;
}

/**
 * The groups come from the categories list (the server has no kind filter, so the kind is filtered here, as in the Group view). A switched-off
 * group is offered and marked, because the server accepts a service in it. The group chosen by "- Select -" shows even before the list loads.
 * "Add New Group" keeps what was typed: it saves the form as a draft before it leaves, and +Add Group brings the person back to it.
 */
export function ServiceGroupRow({ form, type }: ServiceGroupRowProps) {
  const id = useId();
  const categories = useCategories();
  const groups = categories.categories.filter((category) => category.type === type);
  const chosen = form.watch('categoryId');
  const error = form.formState.errors.categoryId;
  const noGroups = !categories.query.isLoading && !categories.query.isError && groups.length === 0;
  const options = withChosen(
    [
      { value: '', label: categories.query.isLoading ? 'Loading…' : 'Choose a group' },
      ...groups.map((group) => ({
        value: group.id,
        label: group.isActive ? group.name : `${group.name} (inactive)`,
      })),
    ],
    chosen,
    `Group ${chosen}`,
  );

  return (
    <FormRow
      label="Service Listed In Group"
      htmlFor={id}
      required
      hint={noGroups ? 'There is no group of this kind yet. Add one first.' : undefined}
      error={error?.message}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SelectField
          id={id}
          options={options}
          selectWrapClassName="w-96 max-w-full"
          aria-required="true"
          {...fieldWiring(id, { hint: noGroups, error: Boolean(error) })}
          {...form.register('categoryId', { validate: (value) => /^\d+$/.test(value) || 'Choose a group.' })}
          value={chosen}
        />
        <Link
          className="link text-sm"
          to={addGroupFromAddPath(type)}
          onClick={() => saveAddDraft(type, form.getValues())}
        >
          Add New Group
        </Link>
      </div>
      <LookupNote what="the groups" query={categories.query} />
    </FormRow>
  );
}
