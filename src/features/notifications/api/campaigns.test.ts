// Tests for the campaign API functions: each one reaches its route with the method, path, query and body of the backend contract, and reads the answer the
// way the screens do. The server is a one-route stand-in that records what it was sent.
import { beforeEach, describe, expect, it } from 'vitest';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { capture } from '../test/capture';
import { campaign, campaignDetail } from '../test/fixtures';
import type { CampaignInput } from '../types';
import {
  cancelCampaign,
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
  updateCampaign,
} from './campaigns';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

const INPUT: CampaignInput = {
  name: 'Winter promo',
  purpose: 'service',
  channels: ['in_app'],
  audience: { staff: {} },
  content: { title: 'Hi', body: 'There' },
  link: null,
};

describe('listCampaigns', () => {
  it('sends the range, sort, search and filters and reads the total from the header', async () => {
    const seen = capture('get', '/admin/notification-campaigns', {
      json: [campaign()],
      headers: { 'x-total-count': '41' },
    });
    const result = await listCampaigns({
      start: 25,
      end: 50,
      sort: ['createdAt'],
      order: ['desc'],
      q: 'promo',
      filters: { status: 'sent', purpose: 'marketing' },
    });
    expect(seen[0]).toMatchObject({
      method: 'GET',
      path: '/admin/notification-campaigns',
      query: {
        _start: ['25'],
        _end: ['50'],
        _sort: ['createdAt'],
        _order: ['desc'],
        q: ['promo'],
        status: ['sent'],
        purpose: ['marketing'],
      },
    });
    expect(result.total).toBe(41);
    expect(result.data[0].name).toBe('Winter promo');
  });
});

describe('a channel the console no longer has', () => {
  // A campaign written when the backend still had another channel keeps that channel's word; the console shows only the channels it knows.
  const OLD = ['in_app', 'telegram', 'email'];

  it('is left out of the channels of a list row', async () => {
    capture('get', '/admin/notification-campaigns', {
      json: [{ ...campaign(), channels: OLD }],
      headers: { 'x-total-count': '1' },
    });
    expect((await listCampaigns()).data[0].channels).toEqual(['in_app', 'email']);
  });

  it('is left out of the channels of one campaign, whichever call returned it', async () => {
    capture('get', '/admin/notification-campaigns/7', { json: { ...campaignDetail(), channels: OLD } });
    expect((await getCampaign(7)).channels).toEqual(['in_app', 'email']);
    capture('post', '/admin/notification-campaigns/7/send', { json: { ...campaignDetail(), channels: OLD } });
    expect((await sendCampaign(7, { confirmRecipients: 3 })).channels).toEqual(['in_app', 'email']);
  });

  it('is ignored with the counters an older backend still sends', async () => {
    capture('get', '/admin/notification-campaigns/7', {
      json: {
        ...campaignDetail(),
        planned: { inApp: 2, email: 2, telegram: 1 },
        delivery: { ...campaignDetail().delivery, telegram: { queued: 0, sent: 1, failed: 0 } },
      },
    });
    const detail = await getCampaign(7);
    expect(detail.channels).toEqual(['in_app', 'email']);
    expect(detail.planned.inApp).toBe(2);
  });
});

describe('getCampaign', () => {
  it('reads one campaign by id', async () => {
    const seen = capture('get', '/admin/notification-campaigns/7', { json: campaignDetail() });
    expect((await getCampaign(7)).audience).toEqual({
      staff: {},
      merchants: {},
      customers: { hasAccount: true },
    });
    expect(seen[0]).toMatchObject({ method: 'GET', path: '/admin/notification-campaigns/7' });
  });
});

describe('createCampaign, updateCampaign, deleteCampaign', () => {
  it('posts the input and reads the draft back', async () => {
    const seen = capture('post', '/admin/notification-campaigns', { json: campaignDetail(), status: 201 });
    expect((await createCampaign(INPUT)).status).toBe('draft');
    expect(seen[0]).toMatchObject({ method: 'POST', path: '/admin/notification-campaigns', body: INPUT });
  });

  it('patches the fields that change', async () => {
    const seen = capture('patch', '/admin/notification-campaigns/7', { json: campaignDetail() });
    await updateCampaign(7, { name: 'Renamed', link: null });
    expect(seen[0]).toMatchObject({
      method: 'PATCH',
      path: '/admin/notification-campaigns/7',
      body: { name: 'Renamed', link: null },
    });
  });

  it('deletes by id and reads no body from the 204', async () => {
    const seen = capture('delete', '/admin/notification-campaigns/7', { status: 204 });
    await expect(deleteCampaign(7)).resolves.toBeUndefined();
    expect(seen[0]).toMatchObject({ method: 'DELETE', path: '/admin/notification-campaigns/7' });
  });
});

describe('the previews', () => {
  it('counts an audience with the body of audience-preview', async () => {
    const answer = {
      total: 3,
      reachable: 2,
      byType: { staff: 2, client: 0, customer: 0 },
      byChannel: { inApp: 2, email: 0 },
      excluded: { noConsent: 0, optedOut: 0, noAccount: 1 },
    };
    const seen = capture('post', '/admin/notification-campaigns/audience-preview', { json: answer });
    const body = { audience: { staff: {} }, channels: ['in_app' as const], purpose: 'service' as const };
    expect((await previewAudience(body)).reachable).toBe(2);
    expect(seen[0]).toMatchObject({
      method: 'POST',
      path: '/admin/notification-campaigns/audience-preview',
      body,
    });
  });

  it('renders a campaign for one channel, with no language in the body', async () => {
    const seen = capture('post', '/admin/notification-campaigns/7/preview', {
      json: { subject: 'S', body: 'B', format: 'text', from: 'F', note: 'N' },
    });
    expect((await previewCampaign(7, { channel: 'email', audience: 'merchant' })).subject).toBe('S');
    expect(seen[0]).toMatchObject({ path: '/admin/notification-campaigns/7/preview' });
    expect(seen[0].body).toEqual({ channel: 'email', audience: 'merchant' });
  });
});

describe('the actions', () => {
  it('sends a test to the caller', async () => {
    const seen = capture('post', '/admin/notification-campaigns/7/test', {
      json: { queued: ['in_app'] },
      status: 202,
    });
    expect(await sendCampaignTest(7, { channels: ['in_app'] })).toEqual({ queued: ['in_app'] });
    expect(seen[0]).toMatchObject({
      method: 'POST',
      path: '/admin/notification-campaigns/7/test',
      body: { channels: ['in_app'] },
    });
  });

  it('sends with the number the staff member confirmed', async () => {
    const seen = capture('post', '/admin/notification-campaigns/7/send', {
      json: campaignDetail({ status: 'queued' }),
      status: 202,
    });
    expect((await sendCampaign(7, { confirmRecipients: 48 })).status).toBe('queued');
    expect(seen[0]).toMatchObject({
      method: 'POST',
      path: '/admin/notification-campaigns/7/send',
      body: { confirmRecipients: 48 },
    });
  });

  it('schedules with an ISO time', async () => {
    const seen = capture('post', '/admin/notification-campaigns/7/schedule', {
      json: campaignDetail({ status: 'scheduled' }),
    });
    await scheduleCampaign(7, { scheduledAt: '2026-11-14T08:00:00.000Z' });
    expect(seen[0]).toMatchObject({
      path: '/admin/notification-campaigns/7/schedule',
      body: { scheduledAt: '2026-11-14T08:00:00.000Z' },
    });
  });

  it('cancels with no body', async () => {
    const seen = capture('post', '/admin/notification-campaigns/7/cancel', {
      json: campaignDetail({ status: 'cancelled' }),
    });
    expect((await cancelCampaign(7)).status).toBe('cancelled');
    expect(seen[0]).toMatchObject({
      method: 'POST',
      path: '/admin/notification-campaigns/7/cancel',
      body: undefined,
    });
  });
});

describe('listCampaignRecipients', () => {
  it('always sends the channel, with the page, the status filter and the total from the header', async () => {
    const seen = capture('get', '/admin/notification-campaigns/7/recipients', {
      json: [],
      headers: { 'x-total-count': '90' },
    });
    const result = await listCampaignRecipients(7, {
      channel: 'email',
      start: 25,
      end: 50,
      filters: { status: 'failed' },
    });
    expect(seen[0]).toMatchObject({
      path: '/admin/notification-campaigns/7/recipients',
      query: { channel: ['email'], _start: ['25'], _end: ['50'], status: ['failed'] },
    });
    expect(result.total).toBe(90);
  });
});
