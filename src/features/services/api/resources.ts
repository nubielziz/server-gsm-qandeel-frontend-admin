// Registers the CRUD resources of the services feature for Refine's data hooks (decision 005). The data provider calls these
// same typed functions, so the lists and the single records have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createCategory, deleteCategory, getCategory, listCategories, updateCategory } from './categories';
import { listInventoryCodes } from './inventory';
import {
  createPricingRule,
  deletePricingRule,
  getPricingRule,
  listPricingRules,
  updatePricingRule,
} from './pricingRules';
import { createService, deleteService, getService, listServices, updateService } from './services';

/** Each resource lists only the operations its endpoints offer: the inventory can be listed, nothing else. */
export const servicesResources: ResourceRegistry = {
  services: {
    list: listServices,
    show: getService,
    create: createService,
    update: updateService,
    delete: deleteService,
  },
  'service-categories': {
    list: listCategories,
    show: getCategory,
    create: createCategory,
    update: updateCategory,
    delete: deleteCategory,
  },
  'pricing-rules': {
    list: listPricingRules,
    show: getPricingRule,
    create: createPricingRule,
    update: updatePricingRule,
    delete: deletePricingRule,
  },
  'inventory-codes': { list: listInventoryCodes },
};
