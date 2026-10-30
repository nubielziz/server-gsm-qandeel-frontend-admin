// SignInBlocked: the screen for a staff member who cannot sign in at all: the account is suspended, or the address
// is not allowed. It replaces the old red banners and says who can fix it. (`?reason=suspended|ip`, or the sign-in call
// answering ACCOUNT_SUSPENDED / IP_NOT_ALLOWED.)
import { ButtonLink } from '@/components/ui';
import { withDestination } from '../destination';
import { useDestination } from '../hooks/useDestination';
import { AUTH_PATHS } from '../paths';
import type { BlockedKind } from './authErrors';
import { AuthStatusScreen } from './AuthStatusScreen';

const COPY: Record<BlockedKind, { title: string; body: string; nextStep?: string }> = {
  suspended: {
    title: 'This account is suspended',
    body: 'An owner can reactivate it from Admins and access.',
  },
  ip: {
    title: 'Sign-in is not allowed from this network',
    body: 'Your IP address is not on the allowed list for this console.',
    nextStep: 'Ask an owner to add it, or sign in from an approved network.',
  },
};

export interface SignInBlockedProps {
  kind: BlockedKind;
  requestId?: string;
  /** Called when the person leaves for the sign-in form, so a page that kept the refusal in state can drop it. */
  onUseAnotherAccount?: () => void;
}

export function SignInBlocked({ kind, requestId, onUseAnotherAccount }: SignInBlockedProps) {
  const { to } = useDestination();
  const { title, body, nextStep } = COPY[kind];
  return (
    <AuthStatusScreen
      title={title}
      body={body}
      nextStep={nextStep}
      requestId={requestId}
      action={
        // Keeps `?to=`, so the next account lands on the page that was asked for.
        <ButtonLink to={withDestination(AUTH_PATHS.login, to)} className="h-9" onClick={onUseAnotherAccount}>
          Use another account
        </ButtonLink>
      }
    />
  );
}
