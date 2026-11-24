// MessageBubble: one message of the thread. A message of the requester's account sits on the left in a bordered bubble, a staff reply
// on the right in the accent tint, and an internal note is a dashed amber block with a lock. Files on the message are listed
// under its text. Ports the `msg` function of threadView (49-p-support.js). The text is typed by a person, so it carries
// `dir="auto"`: a message in a right-to-left script reads and aligns the way it was written (decision 039, text stays data).
import { cx, Icon } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import type { TicketMessage } from '../types';
import { MessageAttachments } from './MessageAttachments';

export function MessageBubble({ message }: { message: TicketMessage }) {
  if (message.isInternal) {
    return (
      <div className="mx-auto max-w-[92%] rounded-md border border-dashed border-warn-dot bg-warn-bg px-3 py-2 text-sm text-warn-fg">
        <p className="mb-0.5 text-2xs font-medium uppercase tracking-wide">
          <Icon name="lock" className="ic-xs me-1 inline" />
          Internal note · {message.authorName} · {fmtDate(message.createdAt)}
        </p>
        {message.body !== '' && (
          <p dir="auto" className="whitespace-pre-wrap">
            {message.body}
          </p>
        )}
        <MessageAttachments message={message} />
      </div>
    );
  }
  const mine = message.authorType === 'staff';
  return (
    <div className={cx('flex', mine && 'justify-end')}>
      <div
        className={cx(
          'max-w-[88%] rounded-lg px-3 py-2 text-sm',
          mine ? 'bg-accent-soft text-ink' : 'border border-line bg-surface',
        )}
      >
        <p className="mb-0.5 text-2xs text-ink3">
          {message.authorName} · {fmtDate(message.createdAt)}
        </p>
        {message.body !== '' && (
          <p dir="auto" className="whitespace-pre-wrap">
            {message.body}
          </p>
        )}
        <MessageAttachments message={message} />
      </div>
    </div>
  );
}
