// Tests for the status rules: which actions each status allows, what the list's "When" and "Recipients" columns show and when the detail keeps refreshing.
import { describe, expect, it } from 'vitest';
import { campaign, campaignDetail } from '../test/fixtures';
import { CAMPAIGN_STATUSES } from '../types';
import {
  canCancel,
  canDelete,
  canEdit,
  canSend,
  canSendTest,
  isInFlight,
  needsRefresh,
  recipientCount,
  STATUS_LOOK,
  whenOf,
} from './status';

describe('what each status allows', () => {
  it('follows the server state machine', () => {
    const allowed = (check: (status: (typeof CAMPAIGN_STATUSES)[number]) => boolean) =>
      CAMPAIGN_STATUSES.filter(check);
    expect(allowed(canEdit)).toEqual(['draft', 'scheduled']);
    expect(allowed(canSend)).toEqual(['draft', 'scheduled']);
    expect(allowed(canSendTest)).toEqual(['draft', 'scheduled']);
    expect(allowed(canCancel)).toEqual(['scheduled', 'queued', 'sending']);
    expect(allowed(canDelete)).toEqual(['draft']);
    expect(allowed(isInFlight)).toEqual(['queued', 'sending']);
  });

  it('gives every status a word and an icon', () => {
    for (const status of CAMPAIGN_STATUSES)
      expect(STATUS_LOOK[status]).toMatchObject({ label: expect.any(String), icon: expect.any(String) });
  });
});

describe('the list columns', () => {
  it('shows when a scheduled campaign goes out, when a sent one finished and else when it was written', () => {
    expect(whenOf(campaign({ status: 'scheduled', scheduledAt: '2026-11-17T08:00:00.000Z' }))).toEqual({
      label: 'Goes out',
      at: '2026-11-17T08:00:00.000Z',
    });
    expect(whenOf(campaign({ status: 'sent', finishedAt: '2026-11-10T10:00:00.000Z' }))).toEqual({
      label: 'Sent',
      at: '2026-11-10T10:00:00.000Z',
    });
    expect(whenOf(campaign({ status: 'draft' }))).toEqual({
      label: 'Created',
      at: '2026-11-10T09:00:00.000Z',
    });
  });

  it('counts the expected recipients before the send and the real ones after', () => {
    expect(recipientCount(campaign({ status: 'draft', expectedRecipients: null }))).toBeNull();
    expect(recipientCount(campaign({ status: 'scheduled', expectedRecipients: 90, recipients: 0 }))).toBe(90);
    expect(recipientCount(campaign({ status: 'sent', expectedRecipients: 90, recipients: 88 }))).toBe(88);
  });
});

describe('when the detail keeps asking', () => {
  it('while the campaign is in flight, or an email message still waits', () => {
    expect(needsRefresh(undefined)).toBe(false);
    expect(needsRefresh(campaignDetail({ status: 'sending' }))).toBe(true);
    expect(needsRefresh(campaignDetail({ status: 'sent' }))).toBe(false);
    const waiting = campaignDetail({ status: 'sent' });
    waiting.delivery.email.queued = 2;
    expect(needsRefresh(waiting)).toBe(true);
  });
});
