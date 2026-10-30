// MessageList: the conversation of one ticket, oldest first, scrolled to the newest message. Ports the message pane of
// threadView (49-p-support.js).
import { useEffect, useRef } from 'react';
import type { TicketMessage } from '../types';
import { MessageBubble } from './MessageBubble';

export function MessageList({ messages }: { messages: readonly TicketMessage[] }) {
  const box = useRef<HTMLDivElement>(null);
  // A new message (a reply just sent, a customer's answer) must be in view; the pane scrolls on its own.
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length]);
  return (
    <div
      ref={box}
      role="log"
      aria-label="Conversation"
      className="max-h-[420px] min-h-[220px] flex-1 space-y-3 overflow-y-auto p-3.5"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
