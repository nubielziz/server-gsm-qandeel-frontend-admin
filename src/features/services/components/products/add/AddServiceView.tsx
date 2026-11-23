// AddServiceView: the +Add Service view as the page draws it: AddView, with the suppliers feature's form that adds services from a supplier
// for its ticked checkbox (taken through the suppliers feature's index).
import { AddFromSupplierForm } from '@/features/suppliers';
import type { ProductsViewProps } from '../types';
import { AddView } from './AddView';

/** The registry's +Add Service view. */
export function AddServiceView(props: ProductsViewProps) {
  return <AddView {...props} SupplierForm={AddFromSupplierForm} />;
}
