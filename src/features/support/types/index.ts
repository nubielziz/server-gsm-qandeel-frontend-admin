// Types for the support feature (`/support`: the inbox, the thread and the reply templates). The map names the routes but gives
// no bodies (MISMATCHES M10), so every shape below is an assumed contract, built from the generated rows in
// `src/lib/api/schema.gen.ts` (`SupportTicketRow`, `TicketMessageRow`, `ReplyTemplateRow`) and narrowed to what the screens use.
import type { RankKind } from '@/features/accounts';
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

/**
 * What the ticket's requester is: always an account (decision 023). A merchant, a shop buyer and a guest are told apart by the
 * rank of the requester (`TicketRequester.rankKind`), never by this word; `requesterId` is the account's id.
 */
export type RequesterType = 'account';

/** The ways a reply can go out. */
export type ReplyChannel = 'email' | 'telegram';

// ---- Tickets ----

/**
 * The account behind a ticket, joined so the inbox needs no second request. `rankKind` is the kind of the rank the account holds now
 * (the server decides it; a word the console does not know reads as `retail`, the fail-closed side). `email` is masked by the server
 * for a caller without `clients:read` (decision 047), whatever the rank.
 */
export type TicketRequester = { name: string; email: string | null; rankKind: RankKind };

/** A staff member as the ticket names them. */
export type StaffRef = { id: Id; name: string };

/**
 * One ticket as `GET /admin/support-tickets` sends a row (assumed contract): the `support_tickets` columns with the words
 * narrowed, the joined `requester` and `assignee`, and the three timers the server works out so the console only formats
 * them: `lastPublicAt` (when the last message the customer could see was written), `slaDueAt` (when the next reply is due,
 * null when nobody waits for one) and `late` (a reply is waiting and `slaDueAt` has passed).
 * Feature 28 (backend B219, always sent) adds the seen marks: `hasUnread` (a requester message staff have not seen),
 * and the highest message each side has seen with the moment, `requesterSeen*` (the requester saw our public replies up to
 * there) and `staffSeen*` (the team saw the requester's messages up to there; staff are one party).
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
  lastPublicAt: IsoDateTime | null;
  late: boolean;
  updatedAt: IsoDateTime;
  hasUnread: boolean;
  requesterSeenMessageId: Id | null;
  requesterSeenAt: IsoDateTime | null;
  staffSeenMessageId: Id | null;
  staffSeenAt: IsoDateTime | null;
};

/** Who wrote a message: the requester's account, a staff member, or the system. The account sits on the requester's side of the thread. */
export type MessageAuthorType = 'account' | 'staff' | 'system';

/**
 * A file on a message (feature 28, backend B218): PDF, JPEG or PNG, at most 5 MiB. Staff download it through
 * `ticketFileUrl`; the requester's files are not virus-scanned.
 */
export type Attachment = { id: Id; filename: string; mime: string; size: number };

/**
 * One message of a thread (assumed contract). `isInternal` marks a note the customer never sees; the author's name is joined
 * so the thread needs no lookup. `attachments` (feature 28, always sent) are the files behind `fileIds`.
 */
export type TicketMessage = Omit<TicketMessageRow, 'authorType' | 'authorId' | 'updatedAt'> & {
  authorType: MessageAuthorType;
  authorId: Id | null;
  authorName: string;
  attachments: Attachment[];
};

/** The answer of `POST /admin/support-tickets/:id/files`: the stored file, whose `id` goes into `fileIds` of a reply or note. */
export type StoredTicketFile = {
  id: Id;
  filename: string;
  size: number;
  mime: string;
  sha256: string;
  createdAt: IsoDateTime;
};

/**
 * `GET /admin/support-tickets/:id` (assumed contract): the list row plus every message, oldest first, and the channels a
 * reply can go out on (`replyChannels`; the server leaves out Telegram for a customer who has no chat with us).
 */
export type SupportTicketDetail = SupportTicket & {
  messages: TicketMessage[];
  replyChannels: ReplyChannel[];
};

/**
 * The filters of the inbox list; `status` as an array repeats the key (any of them). `requesterId` is an account id and needs no type
 * (the server refuses `requesterType` words of the old model). `rankKind` keeps the tickets of merchants or of retail accounts.
 */
export type TicketListFilters = {
  status?: TicketStatus | TicketStatus[];
  late?: boolean;
  assigneeId?: Id;
  requesterId?: Id;
  rankKind?: RankKind;
  q?: string;
};

// ---- Action bodies ----

/**
 * Body of `POST /admin/support-tickets/:id/reply` (assumed contract): the text, the channel when the ticket allows more than
 * one, and the files uploaded before (at most 5). The text may be empty only when `fileIds` has an entry.
 */
export type ReplyBody = { body: string; channel?: ReplyChannel; fileIds?: Id[] };

/** Body of `POST /admin/support-tickets/:id/note` (assumed contract): the text and the files uploaded before (the text may be empty with a file). */
export type NoteBody = { body: string; fileIds?: Id[] };

/** Body of `POST /admin/support-tickets/:id/read` (backend B218): the newest requester message on screen; the team's seen mark moves up to it. */
export type MarkReadBody = { upToMessageId: Id };

/** Body of `POST /admin/support-tickets/:id/files` (backend B218): one file, sent as the `multipart/form-data` part `file`. */
export type TicketFileUpload = { file: File };

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
  body: string;
  shortcut: string;
};

/** Body of `PATCH /admin/reply-templates/:id`: only the fields that change. */
export type UpdateTemplateBody = Partial<CreateTemplateBody>;
