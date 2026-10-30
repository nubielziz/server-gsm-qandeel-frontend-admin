// SignInBlocked: the status card for a sign-in the server refused for good (ACCOUNT_SUSPENDED, IP_NOT_ALLOWED, or the
// same as `?reason=` in the address). Retyping cannot help, so the form gives way to this card.
import { Link } from 'react-router';
import type { IconName } from '@/components/ui';
import { withDestination } from '../destination';
import { useDestination } from '../hooks/useDestination';
import { AUTH_PATHS } from '../paths';
import { authButtonClass } from './authButtonClass';
import type { BlockedKind } from './authErrors';
import { AuthStatusScreen } from './AuthStatusScreen';

/** The words and symbol of each refusal: what happened, then who can fix it. */
const COPY: Record<BlockedKind, { title: string; body: string; nextStep: string; icon: IconName }> = {
  suspended: {
    title: 'This account is suspended',
    body: 'You cannot sign in with it until it is reactivated.',
    nextStep: 'Ask an Owner to reactivate it from Admins and access.',
    icon: 'lock',
  },
  ip: {
    title: 'Sign-in is not allowed from this network',
    body: 'Your IP address is not on the allowed list for this console.',
    nextStep: 'Ask an Owner to add it, or sign in from an approved network.',
    icon: 'globe',
  },
};

export interface SignInBlockedProps {
  kind: BlockedKind;
  requestId?: string;
  /** Called when the person leaves for the sign-in form, so a page that kept the refusal in state can drop it. */
  onUseAnotherAccount?: () => void;
}

/** One action: back to an empty form, for another account. */
export function SignInBlocked({ kind, requestId, onUseAnotherAccount }: SignInBlockedProps) {
  const { to } = useDestination();
  const { title, body, nextStep, icon } = COPY[kind];
  return (
    <AuthStatusScreen
      title={title}
      icon={icon}
      body={body}
      nextStep={nextStep}
      requestId={requestId}
      action={
        // Keeps `?to=`, so the next account lands on the page that was asked for.
        <Link
          to={withDestination(AUTH_PATHS.login, to)}
          className={authButtonClass('secondary')}
          onClick={onUseAnotherAccount}
        >
          Use another account
        </Link>
      }
    />
  );
}
