// MessageList: the conversation of one ticket, oldest first, scrolled to the newest message. Under the team's last public reply it
// says "Sent" or "Seen <time>" (feature 28). Ports the message pane of threadView (49-p-support.js).
import { useEffect, useRef } from 'react';
import { receiptFor } from '../lib/receipt';
import type { TicketMessage } from '../types';
import { MessageBubble } from './MessageBubble';

export interface MessageListProps {
  messages: readonly TicketMessage[];
  /** The highest message the requester has seen and when (the ticket's `requesterSeen*`); null while they have seen none. */
  seenId: number | null;
  seenAt: string | null;
}

export function MessageList({ messages, seenId, seenAt }: MessageListProps) {
  const box = useRef<HTMLDivElement>(null);
  // A new message (a reply just sent, a customer's answer) must be in view; the pane scrolls on its own.
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length]);
  const receipt = receiptFor(messages, seenId, seenAt);
  return (
    <div
      ref={box}
      role="log"
      aria-label="Conversation"
      className="max-h-[420px] min-h-[220px] flex-1 space-y-3 overflow-y-auto p-3.5"
    >
      {messages.map((message) => (
        <div key={message.id}>
          <MessageBubble message={message} />
          {receipt?.messageId === message.id && (
            <p className="mt-0.5 text-end text-2xs text-ink3" data-receipt={receipt.seen ? 'seen' : 'sent'}>
              {receipt.text}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
