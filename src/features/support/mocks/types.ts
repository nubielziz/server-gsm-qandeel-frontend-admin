// Types of the support mock store: a ticket as the mock keeps it (the API's fields plus its messages), and the whole store. Dev
// and tests only (decision 014).
import type { Collection } from '@/mocks/db';
import type { ReplyChannel, ReplyTemplate, StoredTicketFile, SupportTicket, TicketMessage } from '../types';

/**
 * A ticket row of the mock. The three timers (`lastPublicAt`, `slaDueAt`, `late`) and `hasUnread` are not stored: they depend on the clock and
 * on the messages and seen marks, so `dto.ts` works them out on every read, the way the real server would. The four seen marks are stored.
 */
export type MockTicket = Omit<SupportTicket, 'lastPublicAt' | 'slaDueAt' | 'late' | 'hasUnread'> & {
  messages: TicketMessage[];
  replyChannels: ReplyChannel[];
};

/** A file uploaded to a ticket (feature 28): what the upload answered, the ticket it belongs to, and whether a message has taken it yet. */
export type MockFile = StoredTicketFile & { ticketId: number; attached: boolean };

/** The tickets, the reply templates, the uploaded files and the next message and file ids. Handlers change them in place. */
export type SupportState = {
  tickets: Collection<MockTicket>;
  templates: Collection<ReplyTemplate>;
  files: Map<number, MockFile>;
  nextMessageId: number;
  nextFileId: number;
};
