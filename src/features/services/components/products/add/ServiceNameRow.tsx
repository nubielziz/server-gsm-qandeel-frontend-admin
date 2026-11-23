// ServiceNameRow: "Service Name *" of the +Add Service form: the name box and, beside it, the "- Select -" menu that copies the settings of an
// existing service of the same kind into the form (the name and the code stay as typed). Hint under both.
import { useId, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { cx, FormRow, SelectField, type SelectOption } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import { useServiceChoices } from '../../../hooks/useChoices';
import { PICKER_CAP } from '../../../hooks/keys';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import { LookupNote } from '../../LookupNote';
import { copiedSettings, type AddServiceValues } from './addServiceForm';
import { fieldWiring, INVALID_BORDER } from './fieldWiring';

export interface ServiceNameRowProps {
  form: UseFormReturn<AddServiceValues>;
  /** The kind on the strip: the menu offers the services of that kind. */
  type: ServiceType;
  /** What the role may do: without `catalog:update` a copy leaves Status and Order handling as they are. */
  grants: ServiceGrants;
}

/**
 * The menu lists the services of the kind by name (the first 200: the services menus are capped, and the hint says so when the cap is
 * reached). Choosing one fills the group, status, order handling, verification, cancel, delivery time and credit; it never changes the name or
 * the code. Status and Order handling are sent by the update after the create (`catalog:update`), so a role without it does not get them from
 * the copy, and the hint says so. It needs `catalog:read`, which the view already needs.
 */
export function ServiceNameRow({ form, type, grants }: ServiceNameRowProps) {
  const id = useId();
  const services = useServiceChoices(true, type);
  const [source, setSource] = useState('');
  const list = services.data ?? [];
  const error = form.formState.errors.name;
  const switches = !grants.needs('catalog:update').disabled;
  const hint = [
    'Choose a service to fill in the other settings from it.',
    list.length >= PICKER_CAP ? `The first ${PICKER_CAP} by name are listed.` : null,
    switches ? null : 'Status and Order handling are not copied: they need the catalog:update permission.',
  ]
    .filter((sentence) => sentence !== null)
    .join(' ');
  const options: SelectOption[] = [
    { value: '', label: '- Select -' },
    ...list.map((service) => ({ value: service.id, label: service.name })),
  ];

  function copyFrom(value: string) {
    setSource(value);
    const chosen = list.find((service) => String(service.id) === value);
    // Resetting with the typed words kept also clears any message left from an earlier save.
    if (chosen) form.reset({ ...form.getValues(), ...copiedSettings(chosen, { switches }) });
  }

  return (
    <FormRow label="Service Name" htmlFor={id} required hint={hint} error={error?.message}>
      <div className="flex flex-wrap items-start gap-2">
        <input
          id={id}
          className={cx('input w-56', INVALID_BORDER)}
          autoComplete="off"
          maxLength={120}
          aria-required="true"
          {...fieldWiring(id, { hint: true, error: Boolean(error) })}
          {...form.register('name', { validate: (value) => value.trim() !== '' || 'Enter a name.' })}
        />
        <SelectField
          aria-label="Copy settings from"
          options={options}
          selectWrapClassName="w-72 max-w-full"
          value={source}
          onChange={(event) => copyFrom(event.target.value)}
        />
      </div>
      <LookupNote what="the services" query={services} />
    </FormRow>
  );
}
