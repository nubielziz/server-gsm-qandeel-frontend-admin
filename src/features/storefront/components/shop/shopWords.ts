// The words of the shop section: why a service cannot go on the shop yet. They are the publish screens' own words for the same
// reasons; the server decides the reason, the console only says it.
import { BLOCK_WORDS } from '../../lib/publishWords';

/**
 * The reason a service cannot go on the shop now, as the end of a sentence ("the service is switched off"). A reason this console
 * does not know is shown as the server sent it.
 */
export function shopBlockedText(reason: string): string {
  return (BLOCK_WORDS as Record<string, string | undefined>)[reason] ?? reason;
}
