// Tests for the campaign timeline events and the delivery progress.
import { describe, expect, it } from 'vitest';
import { campaignDetail } from '../test/fixtures';
import { progressOf, timelineOf } from './timeline';

describe('timelineOf', () => {
  it('has only the created event for a draft', () => {
    expect(timelineOf(campaignDetail()).map((event) => event.id)).toEqual(['created']);
  });

  it('adds one event per time the campaign has, with the people who did it', () => {
    const detail = campaignDetail({
      status: 'cancelled',
      scheduledAt: '2026-11-11T08:00:00.000Z',
      queuedAt: '2026-11-11T08:00:30.000Z',
      startedAt: '2026-11-11T08:01:00.000Z',
      cancelledAt: '2026-11-11T08:02:00.000Z',
      cancelledBy: { id: 2, name: 'Nadia' },
      updatedBy: { id: 2, name: 'Nadia' },
      updatedAt: '2026-11-10T10:00:00.000Z',
    });
    const events = timelineOf(detail);
    expect(events.map((event) => event.id)).toEqual([
      'created',
      'edited',
      'scheduled',
      'queued',
      'started',
      'cancelled',
    ]);
    expect(events.find((event) => event.id === 'cancelled')).toMatchObject({ by: 'Nadia', kind: 'rejected' });
    expect(events[0].by).toBe('Rami K.');
  });

  it('marks a finished send done and a failed one failed', () => {
    const done = timelineOf(campaignDetail({ status: 'sent', finishedAt: '2026-11-11T08:05:00.000Z' }));
    expect(done.find((event) => event.id === 'finished')).toMatchObject({
      kind: 'completed',
      text: 'Sending finished',
    });
    const failed = timelineOf(campaignDetail({ status: 'failed', finishedAt: '2026-11-11T08:05:00.000Z' }));
    expect(failed.find((event) => event.id === 'finished')).toMatchObject({
      kind: 'rejected',
      text: 'Sending failed',
    });
  });
});

describe('progressOf', () => {
  it('counts made, sent and failed messages against the planned ones', () => {
    const detail = campaignDetail({ planned: { inApp: 10, email: 10 } });
    detail.delivery.inApp.delivered = 10;
    detail.delivery.email = { queued: 4, sent: 5, failed: 1 };
    expect(progressOf(detail)).toEqual({ done: 16, planned: 20, ratio: 0.8 });
  });

  it('is zero while nothing is planned', () => {
    expect(progressOf(campaignDetail())).toEqual({ done: 0, planned: 0, ratio: 0 });
  });
});
