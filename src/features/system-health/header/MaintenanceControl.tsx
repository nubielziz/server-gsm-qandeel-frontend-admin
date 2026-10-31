// MaintenanceControl: the "Maintenance" button of the header and the two dialogs behind it: set or change maintenance, and
// the separate confirm for turning it off. Needs `system:manage` (docs/system-health-design.md, "Controls and confirmation").
import { useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import type { MaintenanceState } from '../types';
import { MaintenanceDialog } from './MaintenanceDialog';
import { MaintenanceOffDialog } from './MaintenanceOffDialog';

export interface MaintenanceControlProps {
  /** From the health read; undefined while it has not arrived or when it failed. */
  maintenance: MaintenanceState | undefined;
}

/**
 * The button says "Maintenance is on" while it is on, so the state is a word and not only the banner. It stays usable when
 * the health read failed: that is exactly when someone may need to close the store, and the call does not depend on it.
 */
export function MaintenanceControl({ maintenance }: MaintenanceControlProps) {
  const [dialog, setDialog] = useState<'edit' | 'off' | null>(null);
  const close = () => setDialog(null);
  return (
    <>
      <ActionButton permission="system:manage" onClick={() => setDialog('edit')}>
        {maintenance?.enabled ? 'Maintenance is on' : 'Maintenance'}
      </ActionButton>
      {dialog === 'edit' && (
        <MaintenanceDialog current={maintenance} onClose={close} onTurnOff={() => setDialog('off')} />
      )}
      {dialog === 'off' && <MaintenanceOffDialog current={maintenance} onClose={close} />}
    </>
  );
}
