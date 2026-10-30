// Tests for the supplier address: the link other pages use and the selection read back from it.
import { describe, expect, it } from 'vitest';
import { parseSupplierParam, supplierPath } from './paths';

describe('supplierPath and parseSupplierParam', () => {
  it('writes the deep link of ARCHITECTURE §5.2', () => {
    expect(supplierPath(3)).toBe('/suppliers?supplier=3');
  });

  it('reads a whole number and nothing else', () => {
    expect(parseSupplierParam(new URLSearchParams('supplier=3'))).toBe(3);
    expect(parseSupplierParam(new URLSearchParams('supplier=3x'))).toBeNull();
    expect(parseSupplierParam(new URLSearchParams('supplier=-1'))).toBeNull();
    expect(parseSupplierParam(new URLSearchParams(''))).toBeNull();
  });
});
