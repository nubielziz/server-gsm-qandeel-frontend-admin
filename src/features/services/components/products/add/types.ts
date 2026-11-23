// What the +Add Service view takes besides the view contract: the supplier form of the ticked checkbox, which lives in the suppliers feature.
import type { ComponentType, ReactNode } from 'react';
import type { Id } from '@/lib/api';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ProductsViewProps } from '../types';

/**
 * The props of the form that adds services from a supplier. `initial` is what the address named (`?supplier=` and `?from=`) when the view
 * opened; `header` is what sits above its rows, inside its view frame (the heading and the "Add services from a supplier" checkbox);
 * `onDone` is called with the ids of the services a finished add created (an empty list when it created none). The form reports its own
 * result above its bar, so the view needs nothing from `onDone`.
 */
export type SupplierFormProps = {
  type: ServiceType;
  initial?: { supplierId?: Id; from?: 'groups' | 'services' };
  header?: ReactNode;
  onDone: (createdIds: Id[]) => void;
};

/** `SupplierForm` is the form the ticked checkbox shows (the registry passes the suppliers feature's AddFromSupplierForm). */
export type AddViewProps = ProductsViewProps & { SupplierForm: ComponentType<SupplierFormProps> };
