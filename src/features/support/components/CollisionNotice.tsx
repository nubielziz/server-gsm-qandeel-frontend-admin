// CollisionNotice: the warning above the composer when a colleague has just answered the ticket (feature 28, plan §2 rule 4). It shows for 30 seconds after that
// public reply and only while the composer holds a draft; there is no lock, the staff member decides. A polite live region, so it is announced when it appears.
import { Icon } from '@/components/ui';
import type { Collision } from '../hooks/useTicketLive';

export function CollisionNotice({ collision, hasDraft }: { collision: Collision | null; hasDraft: boolean }) {
  return (
    <div aria-live="polite">
      {collision && hasDraft && (
        <p className="mb-2 flex items-center gap-1.5 rounded-md border border-warn-dot bg-warn-bg px-2.5 py-1.5 text-xs text-warn-fg">
          <Icon name="alert" className="ic-sm flex-none" />
          {collision.name} just replied. Check the thread before you send.
        </p>
      )}
    </div>
  );
}
