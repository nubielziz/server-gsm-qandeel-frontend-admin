// SignInNotes: the notes above the sign-in form: the password was just set (`?reason=password-set`), or the page that
// sign-in will continue to (`?to=`, which also covers an expired session).
import type { LoginReason } from '../paths';
import { NoticeBanner } from './NoticeBanner';

export interface SignInNotesProps {
  reason: LoginReason | undefined;
  /** The checked `?to=` path (only safe paths get here, see `safeDestination`). */
  to: string | undefined;
}

/** At most one note; the password-set confirmation wins over the destination. */
export function SignInNotes({ reason, to }: SignInNotesProps) {
  if (reason === 'password-set') {
    return (
      <div className="mb-5">
        <NoticeBanner tone="good" icon="checkCircle" title="Password updated" role="status">
          Sign in with your new password.
        </NoticeBanner>
      </div>
    );
  }
  // Any other reason (or none) with a destination: say where the sign-in goes. The path can be long, so it may wrap.
  if (!reason && to) {
    return (
      <p className="mb-5 text-sm text-ink2">
        Sign in to continue to <span className="mono break-all text-ink">{to}</span>
      </p>
    );
  }
  return null;
}
