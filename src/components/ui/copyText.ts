// copyText: copy to the clipboard and confirm with a toast. Ports copyText() of 20-ui.js.
import { toast } from './toast';

/**
 * Unlike the demo, a blocked clipboard (insecure origin, sandboxed frame) shows an error instead of a
 * "Copied" toast, so the operator never believes an ID was copied when it was not.
 */
export async function copyText(text: string, label = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    toast({ kind: 'error', title: 'Could not copy', body: 'Select the text and copy it by hand.' });
    return;
  }
  toast({ kind: 'info', title: label, body: text.length > 48 ? `${text.slice(0, 48)}…` : text, ttl: 2200 });
}
