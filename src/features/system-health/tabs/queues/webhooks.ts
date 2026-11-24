// The row of the Webhooks card (route group `health`): the callbacks the payment gateways send us, and the words that name them.
import type { WebhookHealth, WebhooksHealth } from '../../types';

/** The gateways' callbacks as a table row. */
export interface WebhookRow {
  id: 'incoming';
  name: string;
  /** Who the messages come from. */
  sub: string;
  health: WebhookHealth;
}

/**
 * The one row of the card. Webhooks to merchants are retired, so an answer that still carries an `outgoing` part (an older
 * backend) is read without it.
 */
export function webhookRow(webhooks: WebhooksHealth): WebhookRow {
  return { id: 'incoming', name: 'Payment gateways', sub: 'callbacks we receive', health: webhooks.incoming };
}
