// Small word helpers of the Queues & jobs tab (route group `health`): a count with its noun.
import { num } from '@/lib/format';

/** "1 queue", "8 queues", "1,240 failed jobs": the count with thousands separators and the noun in the right number. */
export function countOf(count: number, noun: string): string {
  return `${num(count)} ${noun}${count === 1 ? '' : 's'}`;
}
