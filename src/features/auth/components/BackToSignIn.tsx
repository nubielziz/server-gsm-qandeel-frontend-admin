// BackToSignIn: the one way back from the later sign-in steps (two-step code and setup, choose a password).
import { Link } from 'react-router';
import { Icon } from '@/components/ui';
import { withDestination } from '../destination';
import { useDestination } from '../hooks/useDestination';
import { AUTH_PATHS } from '../paths';

/** A link to the sign-in form that keeps `?to=`, so the page that was asked for survives the detour. 44px tall. */
export function BackToSignIn() {
  const { to } = useDestination();
  return (
    <Link
      to={withDestination(AUTH_PATHS.login, to)}
      className="-ms-1 inline-flex h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-accent-ink underline-offset-2 hover:underline"
    >
      <Icon name="chevL" className="ic-sm" />
      Back to sign in
    </Link>
  );
}
