// MaintenanceOffDialog: the separate confirm for turning maintenance off (`PUT /admin/system/maintenance`, `enabled: false`).
// It states what customers get back before the button. A refusal of the server shows in the dialog.
import { ConfirmDialog } from '@/components/ui';
import { useSetMaintenance } from '../hooks';
import type { MaintenanceState } from '../types';
import { offSentence } from './maintenance';

export interface MaintenanceOffDialogProps {
  current: MaintenanceState | undefined;
  onClose: () => void;
}

/** A confirm of its own, because turning maintenance off opens the platform to customers at once. */
export function MaintenanceOffDialog({ current, onClose }: MaintenanceOffDialogProps) {
  const setMaintenance = useSetMaintenance({ toastErrors: false });
  return (
    <ConfirmDialog
      open
      title="Turn off maintenance?"
      body={<p>{offSentence(current?.scope)}</p>}
      confirm="Turn off maintenance"
      onClose={onClose}
      onConfirm={() => setMaintenance.mutateAsync({ enabled: false }).then(() => undefined)}
    />
  );
}
