// Rows of the Webhooks card (route group `health`): the two directions, the worse one first, and the words that name
// them. Ordering uses the states the server sent; nothing here judges a rate or an age.
import { compareStates } from '../../lib';
import type { MetricState, WebhookDirectionHealth, WebhooksHealth } from '../../types';

/** One direction of webhook traffic as a table row. */
export interface WebhookRow {
  id: 'outgoing' | 'incoming';
  name: string;
  /** Who the messages go to or come from. */
  sub: string;
  health: WebhookDirectionHealth;
}

/** The worse of a direction's two judged numbers, by the states the server sent. */
function worstState(health: WebhookDirectionHealth): MetricState {
  return compareStates(health.successRate.state, health.oldestAge.state) <= 0
    ? health.successRate.state
    : health.oldestAge.state;
}

/** Outgoing and incoming, the one in the worse server state first. Equal states keep outgoing before incoming. */
export function webhookRows(webhooks: WebhooksHealth): WebhookRow[] {
  const rows: WebhookRow[] = [
    { id: 'outgoing', name: 'Outgoing', sub: 'to merchants', health: webhooks.outgoing },
    { id: 'incoming', name: 'Incoming', sub: 'from payment gateways', health: webhooks.incoming },
  ];
  return rows.sort((a, b) => compareStates(worstState(a.health), worstState(b.health)));
}
