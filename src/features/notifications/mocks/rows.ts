// What the mock fan-out makes for a campaign: one recipient row per person and channel, with a status that depends on how far the send is. The counters of the
// campaign (planned, skipped, delivery) are counted from these rows, so the detail, the recipients table and the progress meter always agree.
import { maskEmail } from '@/lib/format';
import type { CampaignChannel, CampaignDetail, CampaignRecipient } from '../types';
import { eligiblePeople, type MockKind, type MockPerson } from './audience';

/** How far a send is: the fan-out just made the rows (`sending`), or the worker finished them (`done`). */
export type Phase = 'sending' | 'done';

const DOMAIN: Record<MockKind, string> = {
  staff: 'gsm-supply.example',
  merchant: 'merchant.example',
  retail: 'mail.example',
};
const NAME: Record<MockKind, string> = { staff: 'staff', merchant: 'shop', retail: 'buyer' };

function recipientText(person: MockPerson, channel: CampaignChannel): string {
  if (channel === 'in_app') return `${NAME[person.kind]}${person.id}`;
  return maskEmail(`${NAME[person.kind]}${person.id}@${DOMAIN[person.kind]}`);
}

/** The status of one message: in-app items are delivered (every third read); email messages are sent, a few fail, and while sending some still wait. */
function statusOf(
  person: MockPerson,
  channel: CampaignChannel,
  phase: Phase,
): Pick<CampaignRecipient, 'status' | 'error' | 'attempts'> {
  if (channel === 'in_app')
    return { status: person.id % 3 === 0 ? 'read' : 'delivered', error: null, attempts: null };
  if (person.id % 17 === 0) return { status: 'failed', error: 'The mailbox does not exist.', attempts: 3 };
  if (phase === 'sending' && person.id % 3 === 0) return { status: 'queued', error: null, attempts: 0 };
  return { status: 'sent', error: null, attempts: 1 };
}

/** The rows and the counters for a campaign that has been fanned out at `at`. */
export function fanOut(
  campaign: Pick<CampaignDetail, 'audience' | 'purpose' | 'channels'>,
  phase: Phase,
  at: number,
  firstId: number,
) {
  const { people } = eligiblePeople(campaign.audience, campaign.purpose);
  const wants = (channel: CampaignChannel) => campaign.channels.includes(channel);
  const rows: CampaignRecipient[] = [];
  const skipped = { optedOut: 0, noAccount: 0 };
  const reached = new Set<string>();
  let id = firstId;
  for (const person of people) {
    const channels: Record<CampaignChannel, boolean> = {
      in_app: person.inApp,
      email: person.email,
    };
    if (wants('in_app') && !person.inApp) skipped.noAccount += 1;
    if (wants('email') && !person.email) skipped.optedOut += 1;
    for (const channel of campaign.channels) {
      if (!channels[channel]) continue;
      const state = statusOf(person, channel, phase);
      const sent = state.status === 'sent' || state.status === 'failed';
      rows.push({
        id: id++,
        channel,
        recipientType: person.type,
        recipientId: person.id,
        recipient: recipientText(person, channel),
        ...state,
        sentAt: sent ? new Date(at).toISOString() : null,
        readAt: state.status === 'read' ? new Date(at + 60_000).toISOString() : null,
        createdAt: new Date(at).toISOString(),
      });
      reached.add(`${person.type}:${person.id}`);
    }
  }
  const count = (channel: CampaignChannel) => rows.filter((row) => row.channel === channel).length;
  return {
    rows,
    recipients: reached.size,
    skipped,
    planned: { inApp: count('in_app'), email: count('email') },
  };
}

/** The live delivery numbers of a campaign, counted from its rows. */
export function deliveryOf(rows: readonly CampaignRecipient[]): CampaignDetail['delivery'] {
  const of = (channel: CampaignChannel) => rows.filter((row) => row.channel === channel);
  const counters = (channel: CampaignChannel) => ({
    queued: of(channel).filter((row) => row.status === 'queued').length,
    sent: of(channel).filter((row) => row.status === 'sent').length,
    failed: of(channel).filter((row) => row.status === 'failed').length,
  });
  return {
    inApp: {
      delivered: of('in_app').length,
      read: of('in_app').filter((row) => row.status === 'read').length,
    },
    email: counters('email'),
  };
}
