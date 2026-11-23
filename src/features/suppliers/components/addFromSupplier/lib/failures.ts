// What a failed call says in the Add-from-supplier form: the server's words for the result area, and the messages it gave for single
// fields, which belong under those fields. Pure, so the hooks only keep what these return.
import { isApiError } from '@/lib/api';
import { BatchStopped } from '../../../lib/batches';
import { failureText, type StoppedVerb } from '../../../lib/importPlan';
import { isRefusal } from '../../../lib/singlesFlow';

/** The fields of the import body that carry a message of their own: the form shows it under the row of that field. */
export type FailureField = 'status' | 'categoryId' | 'supplierServiceIds';

const FIELDS: readonly FailureField[] = ['status', 'categoryId', 'supplierServiceIds'];

/** One failed call: the line for the result area, and the first message the server gave for each field the form has a row for. */
export type AddFailure = { text: string; fields: Partial<Record<FailureField, string>> };

/**
 * Reads a failure. A call that stopped part-way (`BatchStopped`) keeps its count in the text ("2 of 3 services were added before it
 * stopped"); the field messages come from the error of the call itself. A refusal of the list (a 400 or 422) says what to do next: the
 * same list sent again gets the same answer.
 */
export function describeFailure(failure: unknown, verb: StoppedVerb): AddFailure {
  const reason = failure instanceof BatchStopped ? failure.reason : failure;
  const fields: AddFailure['fields'] = {};
  if (isApiError(reason)) {
    for (const field of FIELDS) {
      const message = reason.fieldErrors[field]?.[0];
      if (message) fields[field] = message;
    }
  }
  const text = failureText(failure, verb);
  return { text: isRefusal(failure) ? `${text} Change what it names and try again.` : text, fields };
}

/** A failure that has no call behind it (the select-all read): the words only. */
export function plainFailure(text: string): AddFailure {
  return { text, fields: {} };
}
