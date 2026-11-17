// Tests for placing a server refusal on the composer's fields.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { audienceLeftovers, messagesUnder, placeErrors } from './serverErrors';

const refusal = (fieldErrors: Record<string, string[]>, formErrors: string[] = []) =>
  new ApiError({
    status: 422,
    code: 'VALIDATION_FAILED',
    title: 'Check the form',
    detail: 'Some fields need attention.',
    fieldErrors,
    formErrors,
  });

describe('placeErrors', () => {
  it('puts the messages of known fields under them and the rest in the general slot', () => {
    const placed = placeErrors(
      refusal(
        {
          name: ['Give a name.'],
          'content.title': ['Write a text.'],
          'audience.merchants.countries': ['Bad code.'],
          mystery: ['What?'],
        },
        ['General.'],
      ),
    );
    expect(placed.fields).toEqual({
      name: 'Give a name.',
      'content.title': 'Write a text.',
      'audience.merchants.countries': 'Bad code.',
    });
    expect(placed.rest).toEqual(['General.', 'mystery: What?']);
  });

  it('falls back to the detail when the error names no field', () => {
    expect(placeErrors(refusal({})).rest).toEqual(['Some fields need attention.']);
  });

  it('shows another kind of error as a general message and nothing for no error', () => {
    expect(placeErrors(new Error('boom')).rest).toEqual(['boom']);
    expect(placeErrors(null)).toEqual({ fields: {}, rest: [] });
  });
});

describe('messagesUnder', () => {
  it('joins the messages of a field and its children', () => {
    const errors = { audience: 'A.', 'audience.include': 'B.', other: 'C.' };
    expect(messagesUnder(errors, 'audience')).toBe('A. B.');
    expect(messagesUnder(errors, 'audience.include')).toBe('B.');
    expect(messagesUnder(errors, 'missing')).toBeUndefined();
  });

  it('keeps the audience messages no control shows itself', () => {
    expect(
      audienceLeftovers({
        audience: 'Empty.',
        'audience.staff.roleIds': 'Too many.',
        'audience.include': 'Dup.',
      }),
    ).toBe('Empty. Too many.');
    expect(audienceLeftovers({ 'audience.merchants.countries': 'Bad.' })).toBeUndefined();
  });
});
