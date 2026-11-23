// Tests for how a failed call is read by the Add-from-supplier form: the words for the result area (with how far a long list got) and the
// messages the server gave for single fields, which the form shows under those fields.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { BatchStopped } from '../../../lib/batches';
import { describeFailure, plainFailure } from './failures';

const refusal = (fieldErrors: Record<string, string[]>) =>
  new ApiError({
    status: 422,
    code: 'VALIDATION_FAILED',
    detail: 'Some fields need attention.',
    fieldErrors,
  });

describe('describeFailure', () => {
  it('keeps the first message the server gave for each field the form has a row for', () => {
    const failure = describeFailure(
      refusal({
        categoryId: ['The group Apple is for IMEI services.', 'Second message.'],
        status: ['Choose active or disabled.'],
        other: ['Not a row of the form.'],
      }),
      'added',
    );
    expect(failure.fields).toEqual({
      categoryId: 'The group Apple is for IMEI services.',
      status: 'Choose active or disabled.',
    });
  });

  it('tells a refusal of the list what to do next, because the same list gets the same answer', () => {
    const failure = describeFailure(
      refusal({ supplierServiceIds: ['Pick at least one service.'] }),
      'previewed',
    );
    expect(failure.text).toBe('Some fields need attention. Change what it names and try again.');
    expect(failure.fields.supplierServiceIds).toBe('Pick at least one service.');
  });

  it('says how far a long list got before it stopped, and reads the fields from the call that failed', () => {
    const stopped = new BatchStopped(
      500,
      603,
      new ApiError({ status: 503, detail: 'Try again in a moment.' }),
    );
    expect(describeFailure(stopped, 'added')).toEqual({
      text: '500 of 603 services were added before it stopped. Try again in a moment.',
      fields: {},
    });
    const refused = new BatchStopped(0, 3, refusal({ categoryId: ['Choose a group.'] }));
    expect(describeFailure(refused, 'added').fields).toEqual({ categoryId: 'Choose a group.' });
  });

  it('gives just the server’s words for any other failure', () => {
    expect(describeFailure(new ApiError({ status: 500, detail: 'It broke.' }), 'added')).toEqual({
      text: 'It broke.',
      fields: {},
    });
  });
});

describe('plainFailure', () => {
  it('is words with no field', () => {
    expect(plainFailure('Could not read the services.')).toEqual({
      text: 'Could not read the services.',
      fields: {},
    });
  });
});
