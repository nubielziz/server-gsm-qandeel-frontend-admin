// TypingLine and StaffTypingLine: the live "is typing" words (feature 28, plan §2 rule 2 and 4). The first sits under the thread and says the requester is typing;
// the second sits in the thread's header and says which colleagues are writing a reply or a note. Both are polite live regions that stay in the page, so a
// screen reader hears the words appear. The words come and go with `useTypingBoard` (6 seconds after the last event, at once when that person's message arrives).
import { Icon } from '@/components/ui';
import type { StaffTyping } from '../hooks/useTypingBoard';

/** `name` is the requester's name; nothing is drawn (but the region stays) when `typing` is false. */
export function TypingLine({ name, typing }: { name: string; typing: boolean }) {
  return (
    <p aria-live="polite" className="min-h-5 px-3.5 text-xs text-ink3">
      {typing && (
        <>
          <Icon name="edit" className="ic-xs me-1 inline" />
          {name} is typing…
        </>
      )}
    </p>
  );
}

/** "Lina S. is replying…" or "Lina S. is writing a note…", one line each, for colleagues only (the board never lists oneself). */
export function StaffTypingLine({ staff }: { staff: readonly StaffTyping[] }) {
  return (
    <div aria-live="polite" className="mt-1 text-xs text-accent">
      {staff.map((person) => (
        <p key={person.staffId}>
          <Icon name="edit" className="ic-xs me-1 inline" />
          {person.name} is {person.mode === 'note' ? 'writing a note' : 'replying'}…
        </p>
      ))}
    </div>
  );
}
