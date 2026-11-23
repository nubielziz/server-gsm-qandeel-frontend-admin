// Which dialog of the Catalog table is open and for which service. The page holds this one value, so the header's actions (Bulk price
// change) and the row menus open dialogs the same way. The New service form is not here: the Add services host opens it ("A service of
// my own"). `shop-page` and `shop-price` are the storefront's listing dialogs, for a service that has a shop page.
import type { Service } from '../types';

/** The dialog the page has open, and for which service. */
export type ServiceDialogState =
  | { kind: 'bulk' }
  | {
      kind: 'price' | 'edit' | 'groups' | 'fields' | 'options' | 'delete' | 'shop-page' | 'shop-price';
      service: Service;
    };
