// FieldsPart: the "Field" part of the edit view (decision 022): how the service sells by quantity, the order fields a buyer fills in, and the
// option lists a buyer picks from. Three sections under their headings, each its own form with its own Save: pressing one sends that
// section alone. The part tells the host it holds unsaved changes while any section does.
import { useDirtySections } from '@/components/ui';
import type { ServicePartProps } from '../../types';
import { CustomFieldsSection } from './fields/CustomFieldsSection';
import { OptionsSection } from './fields/OptionsSection';
import { QuantitySection } from './fields/QuantitySection';

/**
 * Every section needs `catalog:update` to save (the routes are PATCH `/admin/services/:id` for the quantity, PUT `.../fields` and PUT
 * `.../options`); a role without it sees the boxes off with the missing permission named.
 */
export function FieldsPart({ service, grants, onDirtyChange }: ServicePartProps) {
  const report = useDirtySections(onDirtyChange);
  const lock = grants.needs('catalog:update');
  return (
    <div>
      <QuantitySection service={service} lock={lock} onDirtyChange={(dirty) => report('quantity', dirty)} />
      <CustomFieldsSection service={service} lock={lock} onDirtyChange={(dirty) => report('fields', dirty)} />
      <OptionsSection service={service} lock={lock} onDirtyChange={(dirty) => report('options', dirty)} />
    </div>
  );
}
