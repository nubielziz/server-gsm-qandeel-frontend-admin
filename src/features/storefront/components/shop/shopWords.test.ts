// Tests for the words of the shop section: why a service cannot go on the shop, in the publish screens' words.
import { describe, expect, it } from 'vitest';
import { shopBlockedText } from './shopWords';

describe('shopBlockedText', () => {
  it.each([
    ['service_disabled', 'the service is switched off'],
    ['category_inactive', 'its category is switched off'],
    ['b2b_only', 'its category is closed to the public'],
    ['not_orderable', 'it cannot be ordered online'],
  ])('says %s in the publish screens’ words', (reason, words) => {
    expect(shopBlockedText(reason)).toBe(words);
  });

  it('shows a reason this console does not know as the server sent it', () => {
    expect(shopBlockedText('something_new')).toBe('something_new');
  });
});
