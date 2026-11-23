// Tests for the "New category…" step's helpers: where the new category goes, the body that makes it, and the words for a refusal.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { newCategoryBody, nextCategorySort, refusalText } from './newCategory';

describe('nextCategorySort', () => {
  it('starts at 0 and then goes after the last one', () => {
    expect(nextCategorySort([])).toBe(0);
    expect(nextCategorySort([{ sort: 3 }, { sort: 9 }, { sort: 1 }])).toBe(10);
    expect(nextCategorySort([{ sort: 0 }])).toBe(1);
  });
});

describe('newCategoryBody', () => {
  it('names the category, gives it the type, every group, and the last place', () => {
    expect(newCategoryBody('  Fresh ', 'server', [{ sort: 2 }, { sort: 5 }])).toEqual({
      name: 'Fresh',
      type: 'server',
      allowedGroupIds: [],
      sort: 6,
      isActive: true,
    });
  });
});

describe('refusalText', () => {
  it('gives the message the server put on a field, and the ones that name no field', () => {
    const error = new ApiError({
      status: 422,
      detail: 'Some fields need attention.',
      fieldErrors: { name: ['That name is taken.'] },
      formErrors: ['Try again later.'],
    });
    expect(refusalText(error)).toBe('Try again later. That name is taken.');
  });

  it('falls back to the detail, then the message, of any other failure', () => {
    expect(refusalText(new ApiError({ status: 500, title: 'Server error', detail: 'Down for now.' }))).toBe(
      'Down for now.',
    );
    expect(refusalText(new Error('No connection.'))).toBe('No connection.');
  });
});
