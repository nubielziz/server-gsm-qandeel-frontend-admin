// Tests for the timeline's words, who did it and the colour of each node.
import { describe, expect, it } from 'vitest';
import { orderEvent } from '@/test/fixtures/orderRows';
import { eventBy, eventKind, eventText, rejectionReason, toTimelineEvents } from './events';

describe('eventText', () => {
  it('shows the sentence the server sent', () => {
    expect(eventText(orderEvent({ type: 'hold', data: { message: '$3.31 held from Acme wallet' } }))).toBe(
      '$3.31 held from Acme wallet',
    );
  });

  it('builds a sentence from the type and its fields when there is none', () => {
    expect(eventText(orderEvent({ type: 'created', data: { source: 'Dhru API' } }))).toBe(
      'Order received via Dhru API',
    );
    expect(eventText(orderEvent({ type: 'ack', data: { ref: 'NG-1' } }))).toBe(
      'Accepted by the supplier, ref NG-1',
    );
    expect(eventText(orderEvent({ type: 'rejected', data: { reason: 'IMEI is blacklisted' } }))).toBe(
      'IMEI is blacklisted',
    );
    expect(eventText(orderEvent({ type: 'note', data: { body: 'Called the merchant' } }))).toBe(
      'Called the merchant',
    );
  });

  it('reads a type with a prefix, and writes an unknown type in plain words', () => {
    expect(eventText(orderEvent({ type: 'order.completed' }))).toBe('Completed');
    expect(eventText(orderEvent({ type: 'supplier_rate_limited' }))).toBe('Supplier rate limited');
  });
});

describe('eventBy and eventKind', () => {
  it('names the actor, or says what kind of actor it was', () => {
    expect(eventBy(orderEvent({ actor: { type: 'staff', id: 1, name: 'Lina S.' } }))).toBe('Lina S.');
    expect(eventBy(orderEvent({ actor: { type: 'supplier', id: null, name: null } }))).toBe('Supplier');
  });

  it('colours the events the demo coloured', () => {
    expect(eventKind('completed')).toBe('completed');
    expect(eventKind('order_settle')).toBe('settle');
    expect(eventKind('order.rejected')).toBe('rejected');
    expect(eventKind('note')).toBeUndefined();
  });
});

describe('toTimelineEvents', () => {
  it('maps events to the kit’s timeline rows', () => {
    const rows = toTimelineEvents([
      orderEvent({ id: 7, type: 'retry', data: { message: 'Attempt 1 failed (timeout), retried' } }),
    ]);
    expect(rows).toEqual([
      {
        id: 7,
        at: '2026-01-01T11:00:00.000Z',
        kind: 'retry',
        text: 'Attempt 1 failed (timeout), retried',
        by: 'System',
      },
    ]);
  });
});

describe('rejectionReason', () => {
  it('prefers the newest rejection event, then the result the buyer got', () => {
    const events = [
      orderEvent({
        id: 1,
        type: 'rejected',
        data: { reason: 'First' },
        createdAt: '2026-01-01T10:00:00.000Z',
      }),
      orderEvent({
        id: 2,
        type: 'rejected',
        data: { reason: 'Second' },
        createdAt: '2026-01-01T11:00:00.000Z',
      }),
    ];
    expect(rejectionReason(events, { code: 'Result code', comment: null })).toBe('Second');
    expect(rejectionReason([], { code: 'Result code', comment: null })).toBe('Result code');
    expect(rejectionReason(undefined, { code: null, comment: 'Comment' })).toBe('Comment');
  });
});
