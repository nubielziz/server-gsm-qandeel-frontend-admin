// Composer: the reply box under a thread: the reply-template picker, the "Internal note" switch, the text box and the footer. Ports
// the composer of threadView and the tk-send, tk-macro and tk-internal actions (49-p-support.js). A reply or a note is sent to the
// server; if the server refuses, its message shows under the text and the draft stays so nothing typed is lost.
import { useEffect, useRef, useState } from 'react';
import { CheckboxField, cx, errorText, toast } from '@/components/ui';
import { orderLabel, type Order } from '@/features/orders';
import { isApiError } from '@/lib/api';
import type { ComposerState } from '../hooks/useComposerState';
import type { SupportGrants } from '../hooks/useSupportGrants';
import { useAddTicketNote, useReplyToTicket } from '../hooks/useTicketMutations';
import { fillTemplate, ticketValues } from '../lib/macros';
import { firstName } from '../lib/status';
import type { ReplyChannel, ReplyTemplate, SupportTicketDetail } from '../types';
import { ComposerFooter } from './ComposerFooter';
import { MacroPicker } from './MacroPicker';

export interface ComposerProps {
  ticket: SupportTicketDetail;
  /** The linked order, for the template variables and the order buttons. */
  order: Order | undefined;
  /** The templates that fit this ticket's category. */
  templates: readonly ReplyTemplate[];
  grants: SupportGrants;
  state: ComposerState;
  /** Focus the box when it appears (the staff member just chose this ticket on a wide screen). */
  focusOnMount: boolean;
  onOpenOrder: (orderId: number) => void;
}

// The message the composer shows: a field error on the text first, else the server's sentence.
function failureText(error: unknown): string {
  if (isApiError(error)) return error.fieldErrors.body?.[0] ?? errorText(error);
  return errorText(error);
}

export function Composer({
  ticket,
  order,
  templates,
  grants,
  state,
  focusOnMount,
  onOpenOrder,
}: ComposerProps) {
  const reply = useReplyToTicket();
  const note = useAddTicketNote();
  const box = useRef<HTMLTextAreaElement>(null);
  const channels: readonly ReplyChannel[] =
    ticket.replyChannels.length > 0 ? ticket.replyChannels : ['email'];
  const [channel, setChannel] = useState<ReplyChannel>(
    channels.find((value) => value === ticket.channel) ?? channels[0],
  );
  const lock = grants.needs('support:reply');
  const { internal } = state;
  const draft = state.draftOf(ticket.id);
  const active = internal ? note : reply;
  const name = firstName(ticket.requester.name);

  // A wide screen puts the cursor in the box as soon as a ticket is chosen, like the demo.
  useEffect(() => {
    if (focusOnMount) box.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  function insert(template: ReplyTemplate) {
    const values = ticketValues(
      name,
      order ? { label: orderLabel(order), slaMinutes: order.service.slaMinutes } : null,
    );
    state.setDraft(ticket.id, fillTemplate(template.body, values));
    box.current?.focus();
  }

  async function send() {
    const text = draft.trim();
    if (!text) {
      box.current?.focus();
      toast({
        kind: 'error',
        title: 'Write something first',
        body: internal ? 'An empty note isn’t saved.' : 'An empty reply isn’t sent.',
        ttl: 2600,
      });
      return;
    }
    try {
      if (internal) await note.mutateAsync({ ticketId: ticket.id, body: text });
      else
        await reply.mutateAsync({
          ticketId: ticket.id,
          body: text,
          channel: channels.length > 1 ? channel : undefined,
        });
      state.setDraft(ticket.id, '');
    } catch {
      // The mutation holds the error; it shows under the text.
    }
  }

  return (
    <div className="border-t border-line p-3.5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <MacroPicker templates={templates} disabled={lock.disabled} onPick={insert} />
        <span className="flex-1" />
        <CheckboxField
          label="Internal note, customer won’t see it"
          checked={internal}
          disabled={lock.disabled}
          onChange={(event) => state.setInternal(event.target.checked)}
        />
      </div>
      <textarea
        ref={box}
        className={cx('input', internal && '!border-warn-dot !bg-warn-bg')}
        rows={4}
        aria-label={internal ? 'Internal note' : 'Reply'}
        placeholder={internal ? 'Write a note for your team' : `Write a reply to ${name}`}
        value={draft}
        disabled={lock.disabled}
        aria-invalid={active.isError ? true : undefined}
        onChange={(event) => {
          if (active.isError) active.reset();
          state.setDraft(ticket.id, event.target.value);
        }}
      />
      {active.isError && (
        <p role="alert" className="mt-1 text-xs text-crit-fg">
          {failureText(active.error)}
        </p>
      )}
      <ComposerFooter
        internal={internal}
        sending={active.isPending}
        lock={lock}
        channels={channels}
        channel={channel}
        onChannel={setChannel}
        order={order}
        onOpenOrder={onOpenOrder}
        onSend={() => void send()}
      />
    </div>
  );
}
