// InventoryView: the stored codes (the code inventory), inside the Product / Services frame. It is the existing tab drawn in the list grammar
// of the page: a Quick Search box, a dense table with status squares, the "With selected" strip and the pinned footer (the same pieces as
// the Inventory part of the editor); the import and void dialogs stay dialogs in this version. The service menu offers the services delivered from code
// stock of the kind on the strip (the server filters both; the code list itself has no kind filter).
import { InventoryTab } from '../../InventoryTab';
import type { ProductsViewProps } from '../types';

/** The code stock. Needs inventory:read (the view's registry row). */
export function InventoryView({ type }: ProductsViewProps) {
  return <InventoryTab type={type} />;
}
