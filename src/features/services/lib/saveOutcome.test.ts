// Tests for running several saves of a part of the edit view in order.
import { describe, expect, it, vi } from 'vitest';
import { savedInOrder } from './saveOutcome';

describe('savedInOrder', () => {
  it('runs every step in order and says true when all of them saved', async () => {
    const seen: string[] = [];
    const result = await savedInOrder([
      async () => {
        seen.push('price');
        return true;
      },
      async () => {
        seen.push('ranks');
        return undefined;
      },
    ]);
    expect(seen).toEqual(['price', 'ranks']);
    expect(result).toBe(true);
  });

  it('stops at the first step that does not save and returns its result', async () => {
    const ranks = vi.fn(async () => true);
    const result = await savedInOrder([async () => false, ranks]);
    expect(result).toBe(false);
    expect(ranks).not.toHaveBeenCalled();
  });

  it('returns the text of a step that failed with one', async () => {
    const result = await savedInOrder([async () => 'The supplier refused it.', async () => true]);
    expect(result).toBe('The supplier refused it.');
  });

  it('says false when there is nothing to run', async () => {
    expect(await savedInOrder([])).toBe(false);
  });
});
