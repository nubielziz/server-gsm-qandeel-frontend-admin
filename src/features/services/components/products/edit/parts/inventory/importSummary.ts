// The sentence that tells what the server made of an import, for the Import codes section of the Inventory part. The counts are the server's.
import { num } from '@/lib/format';
import { codesText } from '../../../../../lib/codes';
import type { ImportCodesResult } from '../../../../../types';

/**
 * "Imported 2 codes. 2 duplicates skipped. 1 line could not be read. Batch INV-77." Duplicates and unreadable lines are told only when
 * there are some; the batch is told when the server names one.
 */
export function importSummary(result: ImportCodesResult): string {
  const parts = [`Imported ${codesText(result.imported)}.`];
  if (result.duplicates > 0) {
    parts.push(`${num(result.duplicates)} ${result.duplicates === 1 ? 'duplicate' : 'duplicates'} skipped.`);
  }
  if (result.rejected > 0) {
    parts.push(`${num(result.rejected)} ${result.rejected === 1 ? 'line' : 'lines'} could not be read.`);
  }
  if (result.batchRef) parts.push(`Batch ${result.batchRef}.`);
  return parts.join(' ');
}
