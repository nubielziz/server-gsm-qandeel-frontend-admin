// Tests for the rows of the Webhooks card: which direction comes first and how each is named.
import { describe, expect, it } from 'vitest';
import type { MetricState, WebhookDirectionHealth, WebhooksHealth } from '../../types';
import { webhookRows } from './webhooks';

function direction(
  rate: MetricState,
  age: MetricState,
  over: Partial<WebhookDirectionHealth> = {},
): WebhookDirectionHealth {
  return {
    successRate: { value: 99, unit: 'percent', state: rate },
    delivered: 100,
    failed: 1,
    retrying: 0,
    oldestUndeliveredAt: '2026-10-31T12:00:00.000Z',
    oldestAge: { value: 30, unit: 's', state: age },
    ...over,
  };
}

const order = (health: WebhooksHealth) => webhookRows(health).map((row) => row.id);

describe('webhookRows', () => {
  it('keeps outgoing before incoming when both are in the same state', () => {
    expect(order({ outgoing: direction('ok', 'ok'), incoming: direction('ok', 'ok') })).toEqual([
      'outgoing',
      'incoming',
    ]);
  });

  it('puts the direction in the worse server state first', () => {
    expect(order({ outgoing: direction('ok', 'ok'), incoming: direction('crit', 'ok') })).toEqual([
      'incoming',
      'outgoing',
    ]);
    expect(order({ outgoing: direction('warn', 'ok'), incoming: direction('ok', 'ok') })).toEqual([
      'outgoing',
      'incoming',
    ]);
  });

  it('weighs a direction by the worse of its two judged numbers', () => {
    // Outgoing is fine by rate but its oldest message is critical; incoming is only a warning.
    expect(order({ outgoing: direction('ok', 'crit'), incoming: direction('warn', 'ok') })).toEqual([
      'outgoing',
      'incoming',
    ]);
  });

  it('ranks a number nobody could read as a reason to look, ahead of a healthy direction', () => {
    expect(order({ outgoing: direction('ok', 'ok'), incoming: direction('unknown', 'ok') })).toEqual([
      'incoming',
      'outgoing',
    ]);
  });

  it('names who the messages go to or come from', () => {
    const rows = webhookRows({ outgoing: direction('ok', 'ok'), incoming: direction('ok', 'ok') });
    expect(rows.map((row) => `${row.name} ${row.sub}`)).toEqual([
      'Outgoing to merchants',
      'Incoming from payment gateways',
    ]);
  });
});
