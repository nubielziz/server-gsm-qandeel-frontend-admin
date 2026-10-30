// FormAlert: the live summary at the top of each sign-in form. A server failure shows as a visible box; field errors
// are listed for screen readers only, because each one is already printed under its own field.
import type { AuthErrorInfo } from './authErrors';
import { fieldSummary } from './fieldSummary';
import { FormMessage } from './FormMessage';

export interface FormAlertProps {
  /** A failure that is not about one field (wrong pair, rate limit, network, server). */
  problem?: AuthErrorInfo;
  /** Labels of the fields that failed at the last submit, in form order. */
  fields?: readonly string[];
}

/**
 * Renders only after a failed submit. The parent keys it by the submit count, so the same error after a second try
 * is a new alert and is read out again.
 */
export function FormAlert({ problem, fields = [] }: FormAlertProps) {
  if (!problem && fields.length === 0) return null;
  return (
    <div role="alert" className={problem ? 'mb-5' : undefined}>
      {problem && <FormMessage {...problem} />}
      {fields.length > 0 && <p className="sr-only">{fieldSummary(fields)}</p>}
    </div>
  );
}
