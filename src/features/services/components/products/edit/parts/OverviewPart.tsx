// OverviewPart: the "Overview" part of the edit view: status, name, code, group, delivery time, order handling, verification, cancel and
// delivery from code stock, in label-left rows with the pinned "Save". It is built on the details form logic of the old edit dialog (the same mapping and mutation).
import { PartForm } from '@/components/ui';
import { OverviewFields } from '../overview/OverviewFields';
import { useOverviewForm } from '../overview/useOverviewForm';
import type { ServicePartProps } from '../../types';

/**
 * The Overview part. Saving needs `catalog:update`: without it every control is off and the bar says why. The part reports its unsaved
 * changes to the editor, which asks before another part or view is opened. The save is `useUpdateService`, the old dialog's own.
 */
export function OverviewPart({ service, grants, onDirtyChange }: ServicePartProps) {
  const lock = grants.needs('catalog:update');
  const { form, submit, dirty } = useOverviewForm(service, onDirtyChange);
  return (
    <PartForm label="Overview" onSubmit={submit} dirty={dirty} lock={lock}>
      <OverviewFields form={form} service={service} lock={lock} />
    </PartForm>
  );
}
