// Types for the support feature (`/support`: the inbox, the thread and the reply templates). The map names the routes but gives
// no bodies (MISMATCHES M10), so every shape below is an assumed contract, built from the generated rows in
// `src/lib/api/schema.gen.ts` (`SupportTicketRow`, `TicketMessageRow`, `ReplyTemplateRow`) and narrowed to what the screens use.
import type { Id, IsoDateTime } from '@/lib/api';
import type { ReplyTemplateRow, SupportTicketRow, TicketMessageRow } from '@/lib/api/schema.gen';

// ---- Words ----

/** Where a ticket stands: new (nobody answered yet), open, waiting on the customer, or resolved. */
export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved';

/** How fast the first answer is due: the reply target is 2 hours for high, 8 for normal and 24 for low (the demo's `PRIO_TARGET`). */
export type TicketPriority = 'high' | 'normal' | 'low';

/** How the ticket reached us. */
export type TicketChannel = 'email' | 'web' | 'chat' | 'telegram';

/** What the ticket is about (the demo's `TICKET_CATS`); reply templates use the same words. */
export type TicketCategory =
  'delay' | 'failed_unlock' | 'refund' | 'billing' | 'wrong_imei' | 'howto' | 'presale' | 'other';

/** Who wrote the ticket: a storefront customer or a merchant (`client`) on the API. */
export type RequesterType = 'customer' | 'client';

/** The ways a reply can go out. */
export type ReplyChannel = 'email' | 'telegram';

// ---- Tickets ----

/** The person or company behind a ticket, joined so the inbox needs no second request. */
export type TicketRequester = { name: string; email: string | null };

/** A staff member as the ticket names them. */
export type StaffRef = { id: Id; name: string };

/**
 * One ticket as `GET /admin/support-tickets` sends a row (assumed contract): the `support_tickets` columns with the words
 * narrowed, the joined `requester` and `assignee`, and the three timers the server works out so the console only formats
 * them: `lastPublicAt` (when the last message the customer could see was written), `slaDueAt` (when the next reply is due,
 * null when nobody waits for one) and `late` (a reply is waiting and `slaDueAt` has passed).
 */
export type SupportTicket = Omit<
  SupportTicketRow,
  | 'channel'
  | 'requesterType'
  | 'orderId'
  | 'category'
  | 'priority'
  | 'status'
  | 'assigneeId'
  | 'csatScore'
  | 'updatedAt'
> & {
  channel: TicketChannel;
  requesterType: RequesterType;
  requester: TicketRequester;
  orderId: Id | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId: Id | null;
  assignee: StaffRef | null;
  csatScore: number | null;
  lastPublicAt: IsoDateTime | null;
  late: boolean;
  updatedAt: IsoDateTime;
};

/** Who wrote a message. `client` is a merchant; both sit on the customer's side of the thread. */
export type MessageAuthorType = 'customer' | 'client' | 'staff' | 'system';

/**
 * One message of a thread (assumed contract). `isInternal` marks a note the customer never sees; the author's name is joined
 * so the thread needs no lookup.
 */
export type TicketMessage = Omit<TicketMessageRow, 'authorType' | 'authorId' | 'updatedAt'> & {
  authorType: MessageAuthorType;
  authorId: Id | null;
  authorName: string;
};

/**
 * `GET /admin/support-tickets/:id` (assumed contract): the list row plus every message, oldest first, and the channels a
 * reply can go out on (`replyChannels`; the server leaves out Telegram for a customer who has no chat with us).
 */
export type SupportTicketDetail = SupportTicket & {
  messages: TicketMessage[];
  replyChannels: ReplyChannel[];
};

/** The filters of the inbox list; `status` as an array repeats the key (any of them). */
export type TicketListFilters = {
  status?: TicketStatus | TicketStatus[];
  late?: boolean;
  assigneeId?: Id;
  requesterType?: RequesterType;
  requesterId?: Id;
  q?: string;
};

// ---- Action bodies ----

/** Body of `POST /admin/support-tickets/:id/reply` (assumed contract): the text and, when the ticket allows more than one, the channel. */
export type ReplyBody = { body: string; channel?: ReplyChannel };

/** Body of `POST /admin/support-tickets/:id/note` (assumed contract). */
export type NoteBody = { body: string };

/** Body of `PATCH /admin/support-tickets/:id` (assumed contract): only what changes. Resolve and Reopen are `status`. */
export type UpdateTicketBody = {
  priority?: TicketPriority;
  assigneeId?: Id | null;
  status?: 'open' | 'resolved';
};

// ---- Reply templates ----

/** One canned reply (a "macro"), as the API sends it. The body may hold `{{name}}`, `{{order}}` and `{{eta}}`. */
export type ReplyTemplate = Omit<ReplyTemplateRow, 'category' | 'createdBy' | 'updatedAt'> & {
  category: TicketCategory;
  createdBy: Id | null;
  updatedAt: IsoDateTime;
};

/** Body of `POST /admin/reply-templates` (assumed contract). */
export type CreateTemplateBody = {
  title: string;
  category: TicketCategory;
  locale: string;
  body: string;
  shortcut: string;
};

/** Body of `PATCH /admin/reply-templates/:id`: only the fields that change. */
export type UpdateTemplateBody = Partial<CreateTemplateBody>;
