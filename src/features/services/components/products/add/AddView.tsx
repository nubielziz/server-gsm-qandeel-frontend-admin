// AddView: the "+Add Service" view of the Product / Services page. A heading and the checkbox "Add services from a supplier", then one of two
// forms: unticked, one service by hand (AddServiceForm); ticked, the suppliers feature's form (the `SupplierForm` prop the registry gives).
// The ticked state lives in the address (`?supplier=` and `?from=`), so a link from the Suppliers page opens the form with its supplier chosen.
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckboxField, SectionHeading } from '@/components/ui';
import { parseRecordId, productsPath, type ProductsLink } from '../../../lib/productsPath';
import { AddServiceForm } from './AddServiceForm';
import type { AddViewProps } from './types';

/** The way a supplier add starts when the address names none: whole groups, the first choice of the supplier form. */
const DEFAULT_FROM = 'groups';

/** The supplier form reports its own result above its bar, so the view has nothing to do when a run ends. */
const RESULT_IS_SHOWN_BY_THE_FORM = () => undefined;

/**
 * The view. Ticking the box writes `from=groups` to the address (the entry is replaced, so Back leaves the view) and unticking removes the
 * supplier keys. Ticking needs no permission of its own: the supplier form locks what its role may not do. Each form keeps what was typed
 * only while it is shown. The heading and the checkbox go inside each form's own frame (its `header`), so the form's pinned bar still ends
 * at the foot of the window.
 */
export function AddView({ type, grants, SupplierForm }: AddViewProps) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const supplier = parseRecordId(params.get('supplier'));
  const rawFrom = params.get('from');
  const from: ProductsLink['from'] =
    rawFrom === 'groups' ? 'groups' : rawFrom === 'services' ? 'services' : undefined;
  const fromSupplier = supplier !== null || from !== undefined;
  const initial = useMemo(
    () => ({ ...(supplier !== null ? { supplierId: supplier } : {}), ...(from ? { from } : {}) }),
    [supplier, from],
  );

  function toggle(next: boolean) {
    void navigate(productsPath({ view: 'add', type, ...(next ? { from: DEFAULT_FROM } : {}) }), {
      replace: true,
    });
  }

  const header = (
    <>
      <SectionHeading>Add Service</SectionHeading>
      <CheckboxField
        label="Add services from a supplier"
        checked={fromSupplier}
        onChange={(event) => toggle(event.target.checked)}
        wrapperClassName="mt-2"
      />
    </>
  );

  if (!fromSupplier) return <AddServiceForm type={type} grants={grants} header={header} />;
  return <SupplierForm type={type} initial={initial} header={header} onDone={RESULT_IS_SHOWN_BY_THE_FORM} />;
}
