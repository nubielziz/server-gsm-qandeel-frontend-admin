// Registers the CRUD resources of the suppliers feature for Refine's data hooks (decision 005). The data provider calls
// these same typed functions, so the lists and the single records have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { getSupplierApiLog, listSupplierApiLogs } from './logs';
import { createSupplier, deleteSupplier, getSupplier, listSuppliers, updateSupplier } from './suppliers';

/** The API log can only be read; a supplier has all five operations. */
export const suppliersResources: ResourceRegistry = {
  suppliers: {
    list: listSuppliers,
    show: getSupplier,
    create: createSupplier,
    update: updateSupplier,
    delete: deleteSupplier,
  },
  'supplier-api-logs': { list: listSupplierApiLogs, show: getSupplierApiLog },
};
