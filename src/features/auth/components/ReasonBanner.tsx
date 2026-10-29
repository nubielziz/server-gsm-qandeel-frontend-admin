// ReasonBanner: why the sign-in screen is showing, from `/login?reason=…` (set by the auth provider and by set-password).
import type { LoginReason } from '../paths';
import { NoticeBanner } from './NoticeBanner';

export function ReasonBanner({ reason }: { reason: LoginReason | undefined }) {
  switch (reason) {
    case 'suspended':
      return (
        <NoticeBanner tone="crit" icon="ban" title="Account suspended">
          This account is suspended. Ask an owner to reactivate it.
        </NoticeBanner>
      );
    case 'ip':
      return (
        <NoticeBanner tone="crit" icon="shield" title="Sign-in blocked from this network">
          Your IP address is not on the allowlist. Ask an owner to add it, or sign in from an approved
          network.
        </NoticeBanner>
      );
    case 'password-set':
      return (
        <NoticeBanner tone="good" icon="checkCircle" title="Password updated" role="status">
          Sign in with your new password.
        </NoticeBanner>
      );
    default:
      return null;
  }
}
