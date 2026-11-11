// The writes of the campaign screens: save a draft, delete, send, schedule, cancel and send a test. Each refreshes every campaign read (list, detail,
// recipients). A form or dialog shows the server's refusal itself, so these hooks do not toast their errors.
import { useApiMutation } from '@/lib/query';
import {
  cancelCampaign,
  createCampaign,
  deleteCampaign,
  scheduleCampaign,
  sendCampaign,
  sendCampaignTest,
  updateCampaign,
} from '../api';
import type {
  CampaignDetail,
  CampaignInput,
  ScheduleCampaignBody,
  SendCampaignBody,
  TestCampaignBody,
} from '../types';
import { CAMPAIGNS_KEY, INBOX_KEY, UNREAD_KEY } from './keys';

const refresh = { invalidateKeys: [CAMPAIGNS_KEY] };
const noToast = { errorNotification: () => false as const };

/** What the composer saves: a new draft (no `id`) or the changes of a draft or scheduled campaign. */
export type SaveCampaignArgs = { id?: number; input: CampaignInput };

/** Saves the composer: `POST` for a new draft, `PATCH` with the whole form for an existing campaign. */
export function useSaveCampaign(onSaved?: (campaign: CampaignDetail) => void) {
  return useApiMutation({
    mutationFn: ({ id, input }: SaveCampaignArgs) =>
      id === undefined ? createCampaign(input) : updateCampaign(id, input),
    ...refresh,
    ...noToast,
    successNotification: (campaign, { id }) => ({
      message: id === undefined ? 'Draft saved' : 'Campaign saved',
      description: campaign.name,
    }),
    onSuccess: (campaign) => onSaved?.(campaign),
  });
}

export function useDeleteCampaign() {
  return useApiMutation({
    mutationFn: (id: number) => deleteCampaign(id),
    // Only the lists: the page of the deleted draft is still open and must not ask for it again (that would be a 404).
    invalidateKeys: [[...CAMPAIGNS_KEY, 'list']],
    ...noToast,
    successNotification: () => ({ message: 'Draft deleted' }),
  });
}

/** Queues the campaign for sending; `confirmRecipients` is the reachable number the staff member saw. */
export function useSendCampaign() {
  return useApiMutation({
    mutationFn: ({ id, body }: { id: number; body: SendCampaignBody }) => sendCampaign(id, body),
    ...refresh,
    ...noToast,
    successNotification: (campaign) => ({
      message: 'Sending started',
      description: `${campaign.name} is queued. The numbers on this page follow the sending.`,
    }),
  });
}

export function useScheduleCampaign() {
  return useApiMutation({
    mutationFn: ({ id, body }: { id: number; body: ScheduleCampaignBody }) => scheduleCampaign(id, body),
    ...refresh,
    ...noToast,
    successNotification: (campaign) => ({ message: 'Campaign scheduled', description: campaign.name }),
  });
}

export function useCancelCampaign() {
  return useApiMutation({
    mutationFn: (id: number) => cancelCampaign(id),
    ...refresh,
    ...noToast,
    successNotification: (campaign) => ({ message: 'Campaign cancelled', description: campaign.name }),
  });
}

export function useSendTest() {
  return useApiMutation({
    mutationFn: ({ id, body }: { id: number; body: TestCampaignBody }) => sendCampaignTest(id, body),
    // The in-app test lands in the staff member's own inbox, so the bell asks again.
    invalidateKeys: [INBOX_KEY, UNREAD_KEY],
    ...noToast,
    successNotification: ({ queued }) => ({
      message: 'Test queued',
      description: `A test goes to you by ${queued.map((channel) => (channel === 'in_app' ? 'the in-app inbox' : 'email')).join(' and ')}.`,
    }),
  });
}
