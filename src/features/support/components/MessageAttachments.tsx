// MessageAttachments: the files on one message of the thread, as plain links (feature 28, rule 8). Each link goes to the download route, which answers a
// presigned link that saves the file (never shows it inline). A requester's files get the line that says nobody has scanned them for viruses.
import { Icon } from '@/components/ui';
import { ticketFileUrl } from '../api';
import { formatFileSize } from '../lib/attachments';
import { isRequesterMessage } from '../lib/liveEvents';
import type { TicketMessage } from '../types';

export function MessageAttachments({ message }: { message: TicketMessage }) {
  const files = message.attachments ?? [];
  if (files.length === 0) return null;
  return (
    <div className="mt-1.5">
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Attachments">
        {files.map((file) => (
          <li key={file.id}>
            <a
              className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-accent hover:underline"
              href={ticketFileUrl(message.ticketId, file.id)}
              target="_blank"
              rel="noopener"
            >
              <Icon name="paperclip" className="ic-xs flex-none" />
              <span className="truncate">{file.filename}</span>
              <span className="flex-none font-normal text-ink3">{formatFileSize(file.size)}</span>
            </a>
          </li>
        ))}
      </ul>
      {isRequesterMessage(message) && <p className="mt-1 text-2xs text-ink3">Files are not virus-scanned.</p>}
    </div>
  );
}
