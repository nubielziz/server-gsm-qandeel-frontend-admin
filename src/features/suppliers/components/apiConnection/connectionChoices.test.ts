// Tests for the options of the two supplier menus of the API Connection part: who is offered where.
import { describe, expect, it } from 'vitest';
import type { DraftStep } from '../../lib/links';
import { addableSuppliers, NONE_LABEL, primaryOptions, secondaryOptions } from './connectionChoices';

const step = (key: string, supplierId: number, supplierName: string): DraftStep => ({
  key,
  supplierId,
  supplierName,
  supplierServiceId: supplierId * 10,
  supplierServiceName: `Service ${supplierId}`,
});

const suppliers = [
  { id: 1, name: 'Nordic GSM' },
  { id: 2, name: 'Gulf Server Hub' },
  { id: 3, name: 'Rapid IMEI' },
];
const labels = (options: readonly { label: string }[]) => options.map((option) => option.label);

describe('primaryOptions', () => {
  it('offers none, the supplier that is the primary now, and the suppliers no secondary connection uses', () => {
    const options = primaryOptions(suppliers, [step('a', 3, 'Rapid IMEI'), step('b', 1, 'Nordic GSM')]);
    expect(labels(options)).toEqual([NONE_LABEL, 'Rapid IMEI', 'Gulf Server Hub']);
    expect(options[0]).toMatchObject({ value: '', disabled: true });
  });

  it('allows none when there is no secondary connection', () => {
    const options = primaryOptions(suppliers, [step('a', 3, 'Rapid IMEI')]);
    expect(options[0].disabled).toBe(false);
    expect(labels(options)).toEqual([NONE_LABEL, 'Rapid IMEI', 'Nordic GSM', 'Gulf Server Hub']);
  });

  it('shows the primary from the draft even when the supplier list is empty, and offers all suppliers for an empty chain', () => {
    expect(labels(primaryOptions([], [step('a', 3, 'Rapid IMEI')]))).toEqual([NONE_LABEL, 'Rapid IMEI']);
    expect(labels(primaryOptions(suppliers, []))).toEqual([
      NONE_LABEL,
      'Nordic GSM',
      'Gulf Server Hub',
      'Rapid IMEI',
    ]);
  });
});

describe('addableSuppliers and secondaryOptions', () => {
  it('leave out every supplier already in the chain, the primary included', () => {
    const addable = addableSuppliers(suppliers, [step('a', 3, 'Rapid IMEI'), step('b', 1, 'Nordic GSM')]);
    expect(addable).toEqual([{ id: 2, name: 'Gulf Server Hub' }]);
    expect(secondaryOptions(addable, 'Choose a supplier…')).toEqual([
      { value: '', label: 'Choose a supplier…' },
      { value: 2, label: 'Gulf Server Hub' },
    ]);
  });

  it('keep only the first line when nothing is left to add', () => {
    expect(secondaryOptions([], 'No other supplier')).toEqual([{ value: '', label: 'No other supplier' }]);
  });
});
