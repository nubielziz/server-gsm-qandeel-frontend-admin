// SignInNotes: the short notes above the sign-in form. A good-tone "Password updated" after set-password
// (`?reason=password-set`), or, when a protected page sent the visitor here (`?to=`), where sign-in will continue.
import { NoticeBanner } from './NoticeBanner';
import type { LoginReason } from '../paths';

export interface SignInNotesProps {
  reason: LoginReason | undefined;
  /** The checked `?to=` path (only safe paths get here, see `safeDestination`). */
  to: string | undefined;
}

export function SignInNotes({ reason, to }: SignInNotesProps) {
  if (reason === 'password-set') {
    return (
      <NoticeBanner tone="good" icon="checkCircle" title="Password updated" role="status">
        Sign in with your new password.
      </NoticeBanner>
    );
  }
  // Any other reason (or none) with a destination: say where the sign-in goes. The path can be long, so it may wrap.
  if (!reason && to) {
    return (
      <p className="text-sm text-ink2">
        Sign in to continue to <span className="mono break-all">{to}</span>
      </p>
    );
  }
  return null;
}
