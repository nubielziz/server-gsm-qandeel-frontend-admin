// How an entry's action reads in the list, and the entry number shown in the details.

/**
 * The action of an entry as a phrase that follows the person's name ("completed order", "changed price of"). The demo
 * stores that phrase; a server that sends a code instead (`order.completed`, `service_price_changed`) reads well too:
 * dots, dashes and underscores become spaces.
 */
export function actionText(action: string): string {
  const text = action.trim();
  return /\s/.test(text) ? text : text.replace(/[._-]+/g, ' ');
}

/** The entry number as the demo shows it: 42 is "AUD-0042". */
export function auditCode(id: number): string {
  return `AUD-${String(id).padStart(4, '0')}`;
}
