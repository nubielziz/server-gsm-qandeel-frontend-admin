// Registers the CRUD resources of the settings feature for Refine's data hooks (decision 005). The data provider calls these same
// typed functions, so the lists and single records have one code path. `app/resources.ts` merges the registry.
import type { ResourceRegistry } from '@/lib/api';
import { createCurrency, getCurrency, listCurrencies, updateCurrency } from './currencies';
import { createGateway, deleteGateway, getGateway, listGateways, updateGateway } from './gateways';
import { getNotification, listNotifications } from './notifications';
import { createTaxRate, getTaxRate, listTaxRates, updateTaxRate } from './taxRates';
import { createTemplate, deleteTemplate, getTemplate, listTemplates, updateTemplate } from './templates';
import { getWebhookDelivery, listWebhookDeliveries } from './webhooks';

/** Each resource lists only the operations its endpoints offer: tax rates cannot be deleted, the logs can only be read. */
export const settingsResources: ResourceRegistry = {
  'payment-gateways': {
    list: listGateways,
    show: getGateway,
    create: createGateway,
    update: updateGateway,
    delete: deleteGateway,
  },
  'tax-rates': { list: listTaxRates, show: getTaxRate, create: createTaxRate, update: updateTaxRate },
  currencies: { list: listCurrencies, show: getCurrency, create: createCurrency, update: updateCurrency },
  'notification-templates': {
    list: listTemplates,
    show: getTemplate,
    create: createTemplate,
    update: updateTemplate,
    delete: deleteTemplate,
  },
  notifications: { list: listNotifications, show: getNotification },
  'webhook-deliveries': { list: listWebhookDeliveries, show: getWebhookDelivery },
};
