// Tests for the words of the success toasts: each branch says what changed, without needing the rest of the answer.
import { describe, expect, it } from 'vitest';
import {
  ackToast,
  incidentUpdateToast,
  integrityToast,
  maintenanceToast,
  pauseToast,
  retryToast,
  ruleUpdateToast,
  runJobToast,
  supplierToast,
} from './toasts';

describe('maintenanceToast', () => {
  it('names the scope in a sentence', () => {
    const on = (scope: 'store' | 'checkout' | 'api_orders' | 'all') =>
      maintenanceToast({ enabled: true, scope, message: 'Back soon.', expectedEndAt: null }).message;
    expect(on('store')).toBe('Maintenance is on for the store');
    expect(on('checkout')).toBe('Maintenance is on for checkout');
    expect(on('api_orders')).toBe('Maintenance is on for API orders');
    expect(on('all')).toBe('Maintenance is on for the store, checkout and API orders');
  });

  it('says it is off', () => {
    expect(maintenanceToast({ enabled: false }).message).toBe('Maintenance is off');
  });
});

describe('retryToast', () => {
  it('counts the retried jobs with a thousands separator and the right plural', () => {
    expect(retryToast('outbox', 1).message).toBe('Retried 1 failed job');
    expect(retryToast('outbox', 1240).message).toBe('Retried 1,240 failed jobs');
  });

  it('says plainly when nothing was retried', () => {
    expect(retryToast('outbox', 0)).toEqual({
      message: 'No failed jobs were retried',
      description: 'Nothing changed in outbox.',
    });
  });
});

describe('the other action toasts', () => {
  it('say what happened to the queue, the job, the check, the supplier and the alert', () => {
    expect(pauseToast('outbox', { paused: true, reason: 'x' }).message).toBe('outbox paused');
    expect(pauseToast('outbox', { paused: false }).message).toBe('outbox resumed');
    expect(runJobToast('Price sync').message).toBe('Price sync started');
    expect(integrityToast().message).toBe('Integrity check started');
    expect(supplierToast('Dhru Prime', 'paused').message).toBe('Dhru Prime paused');
    expect(supplierToast('Dhru Prime', 'active').message).toBe('Dhru Prime resumed');
    expect(ackToast().message).toBe('Alert acknowledged');
  });
});

describe('ruleUpdateToast', () => {
  const rule = { name: 'API p95 high' };

  it('says muted, with the time, and unmuted', () => {
    const muted = ruleUpdateToast({ mutedUntil: '2026-10-31T18:00:00.000Z' }, rule);
    expect(muted.message).toBe('Rule muted');
    expect(muted.description).toMatch(/^API p95 high stays quiet until \d{2} \w{3}, \d{2}:\d{2}\.$/);
    expect(ruleUpdateToast({ mutedUntil: null }, rule)).toEqual({
      message: 'Rule unmuted',
      description: 'API p95 high alerts again.',
    });
  });

  it('says switched on or off', () => {
    expect(ruleUpdateToast({ isActive: true }, rule).message).toBe('Rule switched on');
    expect(ruleUpdateToast({ isActive: false }, rule).message).toBe('Rule switched off');
  });

  it('says "updated" when several fields changed, or the answer has no name', () => {
    expect(ruleUpdateToast({ threshold: 900, isActive: true }, rule)).toEqual({
      message: 'Rule updated',
      description: 'API p95 high',
    });
    expect(ruleUpdateToast({ isActive: false }, undefined).description).toBe(
      'It will not alert until you switch it on.',
    );
  });
});

describe('incidentUpdateToast', () => {
  const incident = { title: 'Supplier timeouts' };

  it('says closed when the status is resolved', () => {
    expect(incidentUpdateToast({ status: 'resolved', rootCause: 'x' }, incident)).toEqual({
      message: 'Incident closed',
      description: 'Supplier timeouts',
    });
  });

  it('says an update was posted when the body has update text', () => {
    expect(incidentUpdateToast({ status: 'monitoring', update: 'Fix deployed.' }, incident).message).toBe(
      'Update posted',
    );
    expect(incidentUpdateToast({ update: 'Still slow.' }, undefined).description).toBe(
      'It is on the timeline.',
    );
  });

  it('says "updated" for a plain edit', () => {
    expect(incidentUpdateToast({ summary: 'More detail.' }, incident).message).toBe('Incident updated');
  });
});
