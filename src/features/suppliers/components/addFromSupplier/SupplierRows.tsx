// SupplierRows: the first two rows of the Add-from-supplier form: Supplier (the connected suppliers; one that is switched off cannot be chosen
// and says why) and Add (whole groups or single services, the two-part switch).
import { useId } from 'react';
import { FormRow, SelectField, YesNo } from '@/components/ui';
import type { AddState } from './hooks/useAddFromSupplier';
import { supplierBlock, supplierLabel, WAY_HINT } from './lib/addRules';

/** The Supplier select with its notes, and the Add switch. */
export function SupplierRows({ add }: { add: AddState }) {
  const wayId = useId();
  const { suppliers, suppliersLock, supplier, notice, way } = add;
  const sorted = [...suppliers.suppliers].sort((a, b) => a.name.localeCompare(b.name));
  const anySwitchedOff = sorted.some((candidate) => supplierBlock(candidate) !== undefined);
  const hint =
    notice || suppliers.status === 'error' || anySwitchedOff ? (
      <>
        {notice && <span className="block text-ink2">{notice}</span>}
        {suppliers.status === 'error' && (
          <span className="block">
            Could not load the suppliers.{' '}
            <button type="button" className="link" onClick={suppliers.retry}>
              Retry
            </button>
          </span>
        )}
        {anySwitchedOff && (
          <span className="block">
            A supplier that is switched off cannot be chosen. Switch it on from the Suppliers page.
          </span>
        )}
      </>
    ) : undefined;

  return (
    <>
      <SelectField
        layout="row"
        label="Supplier"
        selectWrapClassName="w-full max-w-xl"
        value={supplier?.id ?? ''}
        disabled={suppliersLock.disabled || suppliers.status === 'loading'}
        title={suppliersLock.title}
        hint={hint}
        options={[
          { value: '', label: '- Select -' },
          ...sorted.map((candidate) => ({
            value: candidate.id,
            label: supplierLabel(candidate),
            disabled: supplierBlock(candidate) !== undefined,
          })),
        ]}
        onChange={(event) =>
          add.chooseSupplier(event.target.value === '' ? null : Number(event.target.value))
        }
      />
      <FormRow label="Add" htmlFor={wayId} hint={WAY_HINT[way]}>
        <YesNo
          id={wayId}
          value={way === 'groups'}
          yes="Whole groups"
          no="Single services"
          onChange={(on) => add.setWay(on ? 'groups' : 'services')}
        />
      </FormRow>
    </>
  );
}
