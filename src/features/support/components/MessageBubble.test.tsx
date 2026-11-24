// Tests for MessageBubble: a message typed by a person keeps its own text direction. The console is English only (decision 039),
// but an account may write in Arabic, and the bubble must show that text the way it was written (group C: Arabic text is data).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TicketMessage } from '../types';
import { MessageBubble } from './MessageBubble';

// "Hello, I need help with my order" in Arabic.
const ARABIC_BODY = 'مرحبا، أحتاج مساعدة في طلبي';

function message(patch: Partial<TicketMessage>): TicketMessage {
  return {
    id: 1,
    ticketId: 9,
    authorType: 'account',
    authorId: 103,
    authorName: 'Layla Hassan',
    body: 'Where is my order?',
    isInternal: false,
    fileIds: [],
    attachments: [],
    createdAt: '2026-01-01T10:00:00.000Z',
    ...patch,
  };
}

describe('MessageBubble text direction', () => {
  it('lets the browser pick the direction of a message of an account from its own text', () => {
    render(<MessageBubble message={message({ body: ARABIC_BODY })} />);
    const text = screen.getByText(ARABIC_BODY);
    expect(text).toHaveAttribute('dir', 'auto');
    expect(text).toHaveClass('whitespace-pre-wrap');
  });

  it('does the same for an English message and for an internal note', () => {
    const { rerender } = render(<MessageBubble message={message({})} />);
    expect(screen.getByText('Where is my order?')).toHaveAttribute('dir', 'auto');
    rerender(
      <MessageBubble message={message({ isInternal: true, authorType: 'staff', body: ARABIC_BODY })} />,
    );
    expect(screen.getByText(ARABIC_BODY)).toHaveAttribute('dir', 'auto');
  });
});
