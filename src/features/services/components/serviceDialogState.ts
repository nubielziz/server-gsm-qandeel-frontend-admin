// Which dialog of the Services tab is open and for which service. The page holds this one value, so the header's actions
// (New service, Bulk price change) and the row menus open dialogs the same way.
import type { Service } from '../types';

/** The dialog the page has open, and for which service. */
export type ServiceDialogState =
  | { kind: 'create' }
  | { kind: 'bulk' }
  | { kind: 'price' | 'edit' | 'groups' | 'fields' | 'options' | 'delete'; service: Service };
