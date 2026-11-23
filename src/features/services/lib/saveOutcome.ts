// Runs several saves of one part of the edit view one after the other. A part holds several forms that share one button (Set Pricing: the
// credit and the rank prices); they must save in a fixed order and stop at the first that does not save, so the person fixes one thing and
// presses the same button again. What one save says about itself is the kit's `outcomeOf`.
import { outcomeOf, type FormDialogResult } from '@/components/ui';

/**
 * Runs the saves one after the other. It stops at the first that does not save and returns that result as it is; when all saved it
 * returns `true`. With no save to run it returns `false`: nothing was saved, so there is nothing to say.
 */
export async function savedInOrder(
  steps: readonly (() => Promise<FormDialogResult>)[],
): Promise<FormDialogResult> {
  if (steps.length === 0) return false;
  for (const step of steps) {
    const result = await step();
    if (!outcomeOf(result).saved) return result;
  }
  return true;
}
