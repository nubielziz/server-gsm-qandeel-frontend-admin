// What every section of the Field part takes: the service (read in full), the lock for a role that may not change it, and the way to say the
// section holds unsaved changes.
import type { ServiceDetail } from '../../../../../types';
import type { PermissionLock } from '@/components/ui';

/** The props of a section of the Field part. */
export type FieldsSectionProps = {
  service: ServiceDetail;
  /** Off, with the missing permission in its title, when the staff member may not change the service. */
  lock: PermissionLock;
  /** Says whether the section holds unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
};
