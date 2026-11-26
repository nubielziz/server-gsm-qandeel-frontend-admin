// FieldsPart: the "Field" part of the edit view (decision 022): how the service sells by quantity and the order fields a buyer fills in. Two
// sections under their headings, each its own form with its own Save: pressing one sends that section alone. The part tells the host it
// holds unsaved changes while any section does. (The Options section, the model, network and MEP lists, went with decision 030.)
import { useDirtySections } from '@/components/ui';
import type { ServicePartProps } from '../../types';
import { CustomFieldsSection } from './fields/CustomFieldsSection';
import { QuantitySection } from './fields/QuantitySection';

/**
 * Every section needs `catalog:update` to save (the routes are PATCH `/admin/services/:id` for the quantity and PUT `.../fields`);
 * a role without it sees the boxes off with the missing permission named.
 */
export function FieldsPart({ service, grants, onDirtyChange }: ServicePartProps) {
  const report = useDirtySections(onDirtyChange);
  const lock = grants.needs('catalog:update');
  return (
    <div>
      <QuantitySection service={service} lock={lock} onDirtyChange={(dirty) => report('quantity', dirty)} />
      <CustomFieldsSection service={service} lock={lock} onDirtyChange={(dirty) => report('fields', dirty)} />
    </div>
  );
}
