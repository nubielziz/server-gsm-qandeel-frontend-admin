// Tests for the row of the Webhooks card: how it is named, and that a part the backend no longer sends is not read.
import { describe, expect, it } from 'vitest';
import type { WebhookHealth, WebhooksHealth } from '../../types';
import { webhookRow } from './webhooks';

function health(over: Partial<WebhookHealth> = {}): WebhookHealth {
  return {
    successRate: { value: 99, unit: 'percent', state: 'ok' },
    delivered: 100,
    failed: 1,
    retrying: 0,
    oldestUndeliveredAt: null,
    oldestAge: { value: 0, unit: 's', state: 'ok' },
    ...over,
  };
}

describe('webhookRow', () => {
  it('is the payment gateways row, with the numbers the server sent for incoming webhooks', () => {
    const incoming = health({ delivered: 884 });
    const row = webhookRow({ incoming });
    expect(`${row.name} ${row.sub}`).toBe('Payment gateways callbacks we receive');
    expect(row.id).toBe('incoming');
    expect(row.health).toBe(incoming);
  });

  it('ignores an outgoing part that an older backend still sends', () => {
    const incoming = health();
    const older = { outgoing: health({ failed: 500 }), incoming } as unknown as WebhooksHealth;
    expect(webhookRow(older).health).toBe(incoming);
  });
});
