// CatalogAddServicesDialog: the Add services flow the Catalog page mounts through AddServicesHost: the suppliers feature's frame
// (step 1, "Where from") with its two paths, whole groups (Quick add) and single services (the import).
import { AddServicesDialog, GroupsFlowDialog, SinglesFlowDialog } from '@/features/suppliers';
import type { AddServicesDialogProps } from './AddServicesHost';

// One object for the life of the app, so the frame never sees new path components.
const PATHS = { groups: GroupsFlowDialog, singles: SinglesFlowDialog };

/** The host's dialog props, passed on unchanged, with the two paths. */
export function CatalogAddServicesDialog(props: AddServicesDialogProps) {
  return <AddServicesDialog {...props} paths={PATHS} />;
}
