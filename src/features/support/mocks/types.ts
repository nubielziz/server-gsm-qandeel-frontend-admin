// Types of the support mock store: a ticket as the mock keeps it (the API's fields plus its messages), and the whole store. Dev
// and tests only (decision 014).
import type { Collection } from '@/mocks/db';
import type { ReplyChannel, ReplyTemplate, SupportTicket, TicketMessage } from '../types';

/**
 * A ticket row of the mock. The three timers (`lastPublicAt`, `slaDueAt`, `late`) are not stored: they depend on the clock and on
 * the last message, so `dto.ts` works them out on every read, the way the real server would.
 */
export type MockTicket = Omit<SupportTicket, 'lastPublicAt' | 'slaDueAt' | 'late'> & {
  messages: TicketMessage[];
  replyChannels: ReplyChannel[];
};

/** The tickets, the reply templates and the next message id. Handlers change them in place. */
export type SupportState = {
  tickets: Collection<MockTicket>;
  templates: Collection<ReplyTemplate>;
  nextMessageId: number;
};
