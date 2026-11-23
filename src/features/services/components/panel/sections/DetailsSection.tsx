// DetailsSection: the "Details" section of the service panel. The service's name, code, category, type, SLA and quantity rule,
// saved in place (`PATCH /admin/services/:id`); the panel stays open. Edit mode only: the service exists.
import { useEffect, useRef } from 'react';
import { FormSection } from '@/components/ui';
import { useServiceDetailsForm } from '../../../hooks/useServiceDetailsForm';
import { ServiceDetailsBody } from '../../ServiceDetailsBody';
import type { PanelSectionProps } from '../types';

/**
 * The same fields and the same save as the Edit service dialog, in a FormSection. Nothing takes focus when it opens, the Save
 * button stays off until something changed, and the section tells the panel whether it holds unsaved changes. After a save the
 * form shows the values the server returned. Saving needs `catalog:update`; without it the fields are read-only and the button
 * says which permission is missing. The suppliers of the service have their own section. The panel draws the heading and frame.
 */
export function DetailsSection({ service, grants, onDirtyChange }: PanelSectionProps) {
  const { form, submit } = useServiceDetailsForm(service, undefined, { stay: true });
  const dirty = form.formState.isDirty;
  const gate = grants.needs('catalog:update');

  // The panel asks before it closes or changes service while this is true; it is false again once the section is gone.
  const report = useRef(onDirtyChange);
  useEffect(() => {
    report.current = onDirtyChange;
  });
  useEffect(() => {
    report.current(dirty);
  }, [dirty]);
  useEffect(() => () => report.current(false), []);

  return (
    <FormSection
      onSubmit={submit}
      submitLabel="Save changes"
      dirty={dirty}
      submitDisabled={gate.disabled}
      submitTitle={gate.title}
    >
      <ServiceDetailsBody form={form} service={service} stacked disabled={gate.disabled} />
    </FormSection>
  );
}
