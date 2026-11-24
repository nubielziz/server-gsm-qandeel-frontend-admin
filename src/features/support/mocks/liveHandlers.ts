// Mock of the three live routes of the support thread (backend feature 28, B218): `POST /admin/support-tickets/:id/read` (the team's seen mark),
// `POST …/:id/files` (one attachment, kept in memory) and `GET …/:id/files/:fileId` (the download). Dev and tests only.
import { http, HttpResponse, type HttpHandler } from 'msw';
import { bodyOf, invalid, notFound } from '@/mocks/handlers/accessShared';
import { latency } from '@/mocks/latency';
import { problem } from '@/mocks/problem';
import { guard } from '@/mocks/session';
import { pushRead } from './liveEvents';
import { filePartOf } from './multipart';
import { supportState } from './store';
import type { MockFile } from './types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TYPES: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

/** The type of an upload: the declared one when it is allowed, else the one its extension says, else null (not a PDF, JPEG or PNG). */
function allowedType(filename: string, declared: string): string | null {
  if (Object.values(TYPES).includes(declared)) return declared;
  if (declared !== '' && declared !== 'application/octet-stream') return null;
  return TYPES[filename.split('.').pop()?.toLowerCase() ?? ''] ?? null;
}

const isRequester = (authorType: string): boolean => authorType === 'account';

export const liveHandlers: HttpHandler[] = [
  http.post('*/admin/support-tickets/:id/read', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const ticket = (await supportState()).tickets.find(String(params.id));
    if (!ticket) return notFound('ticket', params.id);
    const { upToMessageId } = await bodyOf(request);
    const upTo = typeof upToMessageId === 'number' ? upToMessageId : 0;
    if (!ticket.messages.some((message) => message.id === upTo)) {
      return invalid([{ field: 'upToMessageId', message: 'That message is not part of this ticket.' }]);
    }
    // The mark is the newest message of the requester's up to there, and it only moves forward.
    const mark = ticket.messages.findLast((message) => isRequester(message.authorType) && message.id <= upTo);
    if (mark && mark.id > (ticket.staffSeenMessageId ?? 0)) {
      const at = new Date().toISOString();
      ticket.staffSeenMessageId = mark.id;
      ticket.staffSeenAt = at;
      pushRead(ticket, 'staff', mark.id, at);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/admin/support-tickets/:id/files', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    const ticket = state.tickets.find(String(params.id));
    if (!ticket) return notFound('ticket', params.id);
    const part = await filePartOf(request);
    if (!part) return invalid([{ field: 'file', message: 'Choose a file to attach.' }]);
    const mime = allowedType(part.filename, part.type);
    if (!mime) return invalid([{ field: 'file', message: 'Only PDF, JPEG and PNG files can be attached.' }]);
    if (part.size > MAX_FILE_BYTES) {
      return problem(413, 'PAYLOAD_TOO_LARGE', 'File too large', 'A file can be 5 MB at most.');
    }
    const file: MockFile = {
      id: state.nextFileId++,
      ticketId: ticket.id,
      filename: part.filename,
      mime,
      size: part.size,
      sha256: '0'.repeat(64),
      createdAt: new Date().toISOString(),
      attached: false,
    };
    state.files.set(file.id, file);
    const { ticketId: _ticket, attached: _attached, ...stored } = file;
    return HttpResponse.json(stored, { status: 201 });
  }),

  // The real route answers a redirect to a link that lives 5 minutes; the mock answers the file itself, as an attachment.
  http.get('*/admin/support-tickets/:id/files/:fileId', async ({ request, params }) => {
    const denied = guard(request);
    if (denied) return denied;
    await latency();
    const state = await supportState();
    const ticket = state.tickets.find(String(params.id));
    const attached = ticket?.messages
      .flatMap((message) => message.attachments)
      .find((file) => String(file.id) === String(params.fileId));
    if (!ticket || !attached) return notFound('file', params.fileId);
    return new HttpResponse('mock file', {
      headers: {
        'content-type': attached.mime,
        'content-disposition': `attachment; filename="${attached.filename}"`,
      },
    });
  }),
];
