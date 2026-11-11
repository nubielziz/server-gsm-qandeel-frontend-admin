// Tests for the mock routes through the API functions: the refusals the server gives (permissions, status transitions, field rules, the confirm number,
// schedule bounds), the send that moves on as time passes, and the inbox actions. The mock is the reference behaviour of the UI tests.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  listCampaignRecipients,
  listCampaigns,
  previewAudience,
  previewCampaign,
  scheduleCampaign,
  sendCampaign,
  sendCampaignTest,
  cancelCampaign,
  updateCampaign,
} from '../api/campaigns';
import { getUnreadCount, listInbox, markAllInboxRead, markInboxRead } from '../api/inbox';
import type { CampaignInput } from '../types';
import { QUEUE_MS, SENDING_MS } from './store';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.useRealTimers());

const INPUT: CampaignInput = {
  name: 'Winter promo',
  purpose: 'service',
  channels: ['in_app', 'email'],
  audience: { staff: {} },
  content: { en: { title: 'Hello', body: 'Hi {{name}}' } },
  link: null,
};

/** The refusal an API call fails with. */
async function refusal(call: Promise<unknown>) {
  try {
    await call;
  } catch (error) {
    if (isApiError(error)) return error;
    throw error;
  }
  throw new Error('The call was not refused.');
}

describe('the list', () => {
  it('lists the three seeded campaigns newest first and filters by status and search', async () => {
    const all = await listCampaigns({ start: 0, end: 25 });
    expect(all.total).toBe(3);
    expect(all.data.map((row) => row.id)).toEqual([3, 2, 1]);
    expect(all.data[0]).not.toHaveProperty('audience');
    expect((await listCampaigns({ filters: { status: 'sent' } })).data.map((row) => row.id)).toEqual([1]);
    expect((await listCampaigns({ q: 'ramadan' })).data.map((row) => row.id)).toEqual([2]);
    expect((await listCampaigns({ filters: { purpose: 'marketing' } })).total).toBe(1);
  });
});

describe('create and edit', () => {
  it('creates a draft that shows in the list and refuses what the server refuses', async () => {
    const draft = await createCampaign(INPUT);
    expect(draft).toMatchObject({ id: 4, status: 'draft', createdBy: { id: expect.any(Number) } });
    expect((await listCampaigns()).total).toBe(4);

    const bad = await refusal(
      createCampaign({
        ...INPUT,
        name: ' ',
        channels: ['telegram'],
        audience: {},
        content: { en: { title: '<b>Hi</b>', body: 'Hello {{email}}' } },
        link: { staff: 'https://evil.example' },
      }),
    );
    expect(bad).toMatchObject({ status: 422, code: 'VALIDATION_FAILED' });
    expect(Object.keys(bad.fieldErrors).sort()).toEqual([
      'audience',
      'channels',
      'content.en.body',
      'content.en.title',
      'link.staff',
      'name',
    ]);
  });

  it('edits a draft and a scheduled campaign, and refuses a sent one with INVALID_TRANSITION', async () => {
    expect((await updateCampaign(3, { name: 'Renamed' })).name).toBe('Renamed');
    expect((await updateCampaign(2, { channels: ['email', 'in_app'] })).channels).toEqual([
      'email',
      'in_app',
    ]);
    expect(await refusal(updateCampaign(1, { name: 'Late' }))).toMatchObject({
      status: 409,
      code: 'INVALID_TRANSITION',
    });
  });

  it('refuses an edit that makes the merged campaign invalid', async () => {
    const error = await refusal(
      updateCampaign(3, { channels: ['telegram', 'in_app'], audience: { staff: {} } }),
    );
    expect(error.fieldErrors.channels).toBeDefined();
  });

  it('deletes only a draft', async () => {
    await deleteCampaign(3);
    expect(await refusal(getCampaign(3))).toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(await refusal(deleteCampaign(1))).toMatchObject({ status: 409, code: 'NOT_A_DRAFT' });
  });
});

describe('the live count and the preview', () => {
  it('counts an audience and refuses an empty one or Telegram without merchants', async () => {
    const preview = await previewAudience({
      audience: { staff: {} },
      channels: ['in_app', 'email'],
      purpose: 'service',
    });
    expect(preview).toMatchObject({ total: 6, reachable: 6, byType: { staff: 6, client: 0, customer: 0 } });
    expect(
      (await refusal(previewAudience({ audience: {}, channels: ['email'], purpose: 'service' }))).fieldErrors
        .audience,
    ).toBeDefined();
    expect(
      (
        await refusal(
          previewAudience({ audience: { staff: {} }, channels: ['telegram'], purpose: 'service' }),
        )
      ).fieldErrors.channels,
    ).toBeDefined();
  });

  it('renders the campaign with a sample name, html for email, and says when Arabic falls back to English', async () => {
    const text = await previewCampaign(3, { locale: 'en', channel: 'in_app' });
    expect(text).toMatchObject({
      subject: 'New unlock services',
      format: 'text',
      from: 'In-app notification',
    });
    expect(text.body).toContain('Hello Daniel');
    const email = await previewCampaign(3, { locale: 'en', channel: 'email' });
    expect(email.format).toBe('html');
    const draft = await createCampaign(INPUT);
    expect((await previewCampaign(draft.id, { locale: 'ar', channel: 'in_app' })).note).toMatch(
      /no Arabic text/,
    );
  });
});

describe('send', () => {
  it('queues a draft with the confirmed number and then moves it along: queued, sending with messages waiting, sent', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { reachable } = await previewAudience({
      audience: { staff: {}, merchants: {} },
      channels: ['in_app', 'email'],
      purpose: 'service',
    });
    const draft = await createCampaign({ ...INPUT, audience: { staff: {}, merchants: {} } });
    const queued = await sendCampaign(draft.id, { confirmRecipients: reachable });
    expect(queued).toMatchObject({ status: 'queued', expectedRecipients: reachable });

    vi.advanceTimersByTime(QUEUE_MS + 100);
    const sending = await getCampaign(draft.id);
    expect(sending.status).toBe('sending');
    expect(sending.recipients).toBe(reachable);
    expect(sending.delivery.email.queued).toBeGreaterThan(0);

    vi.advanceTimersByTime(SENDING_MS + 100);
    const sent = await getCampaign(draft.id);
    expect(sent.status).toBe('sent');
    expect(sent.delivery.email.queued).toBe(0);
    expect(sent.delivery.inApp.delivered).toBe(reachable);
  });

  it('answers 409 CONFLICT when the audience drifted beyond the tolerance, and 422 when nobody is reachable', async () => {
    const draft = await createCampaign({ ...INPUT, audience: { staff: {}, merchants: {} } });
    const conflict = await refusal(sendCampaign(draft.id, { confirmRecipients: 9 }));
    expect(conflict).toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(conflict.detail).toMatch(/now reaches \d+ people, not 9/);
    // The tolerance: max(5, 2 %). A staff-only audience of 6 accepts a confirmed 10, but not 12.
    const staff = await createCampaign(INPUT);
    expect((await sendCampaign(staff.id, { confirmRecipients: 10 })).status).toBe('queued');
    const staff2 = await createCampaign(INPUT);
    expect(await refusal(sendCampaign(staff2.id, { confirmRecipients: 12 }))).toMatchObject({
      code: 'CONFLICT',
    });
    const nobody = await createCampaign({
      ...INPUT,
      channels: ['telegram'],
      audience: { merchants: { groupIds: [99] } },
    });
    expect(
      (await refusal(sendCampaign(nobody.id, { confirmRecipients: 1 }))).fieldErrors.audience,
    ).toBeDefined();
  });

  it('refuses a campaign that is not a draft or scheduled', async () => {
    expect(await refusal(sendCampaign(1, { confirmRecipients: 5 }))).toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });
});

describe('schedule and cancel', () => {
  it('schedules within one minute to 90 days and refuses outside', async () => {
    const at = (ms: number) => new Date(Date.now() + ms).toISOString();
    expect((await scheduleCampaign(3, { scheduledAt: at(3_600_000) })).status).toBe('scheduled');
    expect(
      (await refusal(scheduleCampaign(3, { scheduledAt: at(10_000) }))).fieldErrors.scheduledAt,
    ).toBeDefined();
    expect(
      (await refusal(scheduleCampaign(3, { scheduledAt: at(91 * 86_400_000) }))).fieldErrors.scheduledAt,
    ).toBeDefined();
    const moved = await scheduleCampaign(2, { scheduledAt: at(7_200_000) });
    expect(Math.abs(Date.parse(moved.scheduledAt as string) - (Date.now() + 7_200_000))).toBeLessThan(5_000);
  });

  it('cancels a scheduled campaign, refuses a draft or a sent one', async () => {
    const cancelled = await cancelCampaign(2);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancelledBy: { id: expect.any(Number) } });
    expect(await refusal(cancelCampaign(3))).toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(await refusal(cancelCampaign(1))).toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('fails the messages still waiting when a sending campaign is cancelled', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const draft = await createCampaign({ ...INPUT, audience: { staff: {}, merchants: {} } });
    const { reachable } = await previewAudience({
      audience: draft.audience,
      channels: draft.channels,
      purpose: 'service',
    });
    await sendCampaign(draft.id, { confirmRecipients: reachable });
    vi.advanceTimersByTime(QUEUE_MS + 100);
    await cancelCampaign(draft.id);
    const after = await getCampaign(draft.id);
    expect(after.delivery.email.queued).toBe(0);
    const failed = await listCampaignRecipients(draft.id, {
      channel: 'email',
      filters: { status: 'failed' },
    });
    expect(failed.data.some((row) => row.error === 'The campaign was cancelled.')).toBe(true);
  });
});

describe('the recipients', () => {
  it('lists the sent campaign per channel with masked addresses and filters by status', async () => {
    const email = await listCampaignRecipients(1, { channel: 'email', start: 0, end: 25 });
    expect(email.total).toBeGreaterThan(25);
    expect(email.data).toHaveLength(25);
    expect(email.data.every((row) => row.channel === 'email' && row.recipient.includes('•••'))).toBe(true);
    const read = await listCampaignRecipients(1, { channel: 'in_app', filters: { status: 'read' } });
    expect(read.data.length).toBeGreaterThan(0);
    expect(read.data.every((row) => row.status === 'read')).toBe(true);
  });

  it('wants a channel', async () => {
    const call = listCampaignRecipients(1, { channel: undefined as never });
    expect((await refusal(call)).fieldErrors.channel).toBeDefined();
  });
});

describe('the test send', () => {
  it("queues an in-app item in the staff member's own inbox, and only for a draft or scheduled campaign", async () => {
    const before = (await getUnreadCount()).unread;
    expect(await sendCampaignTest(3, { channels: ['in_app'], locale: 'en' })).toEqual({ queued: ['in_app'] });
    expect((await getUnreadCount()).unread).toBe(before + 1);
    expect(await sendCampaignTest(3, {})).toEqual({ queued: ['in_app', 'email'] });
    expect(await refusal(sendCampaignTest(1, {}))).toMatchObject({ code: 'INVALID_TRANSITION' });
  });
});

describe('the inbox', () => {
  it('lists newest first, filters unread and counts unread', async () => {
    const all = await listInbox({ start: 0, end: 20 });
    expect(all.total).toBe(5);
    expect(all.data.map((item) => item.id)).toEqual([5, 4, 3, 2, 1]);
    const unread = await listInbox({ unread: true });
    expect(unread.data.map((item) => item.id)).toEqual([5, 3]);
    expect(await getUnreadCount()).toEqual({ unread: 2 });
    expect((await listInbox({ start: 0, end: 2 })).data).toHaveLength(2);
  });

  it('marks one read (again is fine, an unknown id is a 404) and marks all read up to an id', async () => {
    await markInboxRead(5);
    await markInboxRead(5);
    expect(await getUnreadCount()).toEqual({ unread: 1 });
    expect(await refusal(markInboxRead(999))).toMatchObject({ status: 404 });
    expect(await markAllInboxRead({ upToId: 2 })).toEqual({ updated: 0 });
    expect(await markAllInboxRead()).toEqual({ updated: 1 });
    expect(await getUnreadCount()).toEqual({ unread: 0 });
  });
});
