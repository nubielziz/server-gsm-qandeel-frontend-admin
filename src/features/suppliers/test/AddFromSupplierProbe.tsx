// A test host for AddFromSupplierForm on its own: the form with the kind and the opening address state a test gives it, and a line that says what
// the host was told (what `onDone` got), so a test can read it. Import it from tests only.
import { useState, type ReactNode } from 'react';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import { AddFromSupplierForm } from '../components/addFromSupplier/AddFromSupplierForm';
import type { AddInitial } from '../components/addFromSupplier/lib/addRules';

/** The form, and under it "Told nothing" or "Told 2 time(s): [4,5] [6]" (one pair of brackets for each call of `onDone`). */
export function AddFromSupplierProbe({
  type,
  initial,
  header,
}: {
  type: ServiceType;
  initial?: AddInitial;
  /** What the host puts above the form's rows, inside its frame. */
  header?: ReactNode;
}) {
  const [told, setTold] = useState<Id[][]>([]);
  return (
    <div>
      <AddFromSupplierForm
        type={type}
        initial={initial}
        header={header}
        onDone={(ids) => setTold((before) => [...before, ids])}
      />
      <p data-testid="told">
        {told.length === 0
          ? 'Told nothing'
          : `Told ${told.length} time(s): ${told.map((ids) => `[${ids.join(',')}]`).join(' ')}`}
      </p>
    </div>
  );
}
