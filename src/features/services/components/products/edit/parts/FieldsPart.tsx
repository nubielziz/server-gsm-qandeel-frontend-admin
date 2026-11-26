// FieldsPart: the "Field" part of the edit view (decision 022): the order fields a buyer fills in and how the service sells by quantity. One
// section, Custom Fields, with the fields table and, under it, the quantity, saved by one Save (decision 032). The part tells the host it holds
// unsaved changes while the section does. (The Options section went with decision 030; the Quantity Field section went with 032.)
import type { ServicePartProps } from '../../types';
import { CustomFieldsSection } from './fields/CustomFieldsSection';

/**
 * Saving needs `catalog:update` (the routes are PUT `/admin/services/:id/fields` for the fields and PATCH `/admin/services/:id` for the
 * quantity; the one Save sends only the part that changed); a role without it sees the boxes off with the missing permission named.
 */
export function FieldsPart({ service, grants, onDirtyChange }: ServicePartProps) {
  const lock = grants.needs('catalog:update');
  return (
    <div>
      <CustomFieldsSection service={service} lock={lock} onDirtyChange={onDirtyChange} />
    </div>
  );
}
