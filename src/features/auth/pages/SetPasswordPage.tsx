// SetPasswordPage: choose a password from an invite or reset link (`/set-password?token=…`), or replace a temporary
// password right after signing in (no token). No demo screen exists (MISMATCHES M5).
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authButtonClass } from '../components/authButtonClass';
import type { AuthErrorInfo } from '../components/authErrors';
import { AuthShell } from '../components/AuthShell';
import { AuthStatusScreen } from '../components/AuthStatusScreen';
import { BackToSignIn } from '../components/BackToSignIn';
import { SetPasswordForm } from '../components/SetPasswordForm';
import { withDestination } from '../destination';
import { useDestination } from '../hooks/useDestination';
import { AUTH_PATHS } from '../paths';

/** The form, or a status card once the server says the link is dead (retyping cannot fix that). */
export function SetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? undefined;
  const { to } = useDestination();
  const [deadLink, setDeadLink] = useState<AuthErrorInfo>();

  if (deadLink) {
    return (
      <AuthStatusScreen
        title={deadLink.title}
        icon="link"
        // The server's words win; the next step is added only when it gave none.
        body={deadLink.detail ?? 'This link has expired or was already used.'}
        nextStep={deadLink.detail ? undefined : 'Ask an Owner to send you a new link.'}
        requestId={deadLink.requestId}
        action={
          <Link to={withDestination(AUTH_PATHS.login, to)} className={authButtonClass('secondary')}>
            Back to sign in
          </Link>
        }
      />
    );
  }

  return (
    <AuthShell
      title="Choose a password"
      intro={
        token
          ? 'Choose the password you will use to sign in.'
          : 'Your password is temporary. Choose a new one to continue.'
      }
      footer={<BackToSignIn />}
    >
      <SetPasswordForm token={token} onDeadLink={setDeadLink} />
    </AuthShell>
  );
}
