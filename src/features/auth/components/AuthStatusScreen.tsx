// AuthStatusScreen: a sign-in screen with no form, only an answer: a title, what it means, the next step and one way
// out. Used when sign-in is blocked (account suspended, address not allowed), in the same layout as the form screens.
import type { ReactNode } from 'react';
import { AuthLayout } from './AuthLayout';

export interface AuthStatusScreenProps {
  title: string;
  /** What is the matter, in one sentence. */
  body: ReactNode;
  /** What the person can do about it, when the body does not already say. */
  nextStep?: ReactNode;
  /** Support reference the server gave for the failure, shown quietly under the action. */
  requestId?: string;
  /** The way out, usually a link back to the sign-in form. */
  action?: ReactNode;
}

export function AuthStatusScreen({ title, body, nextStep, requestId, action }: AuthStatusScreenProps) {
  return (
    <AuthLayout
      title={title}
      focusTitle
      intro={
        <>
          <p>{body}</p>
          {nextStep && <p className="mt-2">{nextStep}</p>}
        </>
      }
    >
      {action}
      {requestId && (
        <p className="text-xs text-ink3">
          Request <span className="mono">{requestId}</span>
        </p>
      )}
    </AuthLayout>
  );
}
