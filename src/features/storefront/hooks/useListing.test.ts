// Tests for the key of the listing read: a listing write invalidates the start of every detail key, so it must match them all.
import { describe, expect, it } from 'vitest';
import { listingDetailKey } from './keys';
import { LISTING_DETAILS_KEY } from './useListing';

describe('LISTING_DETAILS_KEY', () => {
  it('is the start of the key of every listing detail', () => {
    for (const id of [1, 5, 4096]) {
      expect(listingDetailKey(id).slice(0, LISTING_DETAILS_KEY.length)).toEqual([...LISTING_DETAILS_KEY]);
    }
  });
});
