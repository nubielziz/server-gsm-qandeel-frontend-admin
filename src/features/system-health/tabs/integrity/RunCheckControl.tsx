// RunCheckControl: the "Run check now" button of the Last run card and the dialog behind it. Needs `system:manage`
// (docs/system-health-design.md, "Controls and confirmation"); it is disabled while a run is going.
import { useState } from 'react';
import { Icon } from '@/components/ui';
import { ActionButton } from '../../components';
import type { JobRun } from '../../types';
import { RunCheckDialog } from './RunCheckDialog';

export interface RunCheckControlProps {
  /** The server says a run is going: a second one would be refused, so the button waits. */
  running: boolean;
  onStarted: (run: JobRun) => void;
}

/**
 * `ActionButton` hides the button from a read-only staff member and disables it, with the reason, for one who lacks
 * `system:manage`. While a run is going it is disabled with that reason as its title.
 */
export function RunCheckControl({ running, onStarted }: RunCheckControlProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton
        permission="system:manage"
        disabled={running}
        title={running ? 'The check is running now' : undefined}
        onClick={() => setOpen(true)}
      >
        <Icon name="play" className="ic-sm" />
        Run check now
      </ActionButton>
      {open && <RunCheckDialog onClose={() => setOpen(false)} onStarted={onStarted} />}
    </>
  );
}
