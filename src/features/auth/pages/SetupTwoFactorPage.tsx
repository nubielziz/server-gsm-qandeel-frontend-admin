// SetupTwoFactorPage: first sign-in, scan the QR code (or type the key) and confirm with the first code
// (`/login/setup-2fa`). No demo screen exists (MISMATCHES M5).
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui';
import { AuthenticatorSetup } from '../components/AuthenticatorSetup';
import { AuthLayout } from '../components/AuthLayout';
import { CodeForm } from '../components/CodeForm';
import { SetupFailure } from '../components/SetupFailure';
import { withDestination } from '../destination';
import { useCodeStep } from '../hooks/useCodeStep';
import { useDestination } from '../hooks/useDestination';
import { useTwoFactorSetup } from '../hooks/useTwoFactorSetup';
import { AUTH_PATHS } from '../paths';

// Loading shape: the QR tile and the key row.
function SetupSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Preparing your setup key">
      <Skeleton width={176} height={176} />
      <Skeleton height={44} />
    </div>
  );
}

export function SetupTwoFactorPage() {
  const setup = useTwoFactorSetup();
  const { verify, isPending } = useCodeStep();
  const { to } = useDestination();
  return (
    <AuthLayout
      title="Set up two-step verification"
      intro="Every staff account needs an authenticator app. Scan the code below with it, then enter the 6 digits it shows."
      footer={
        <Link className="link" to={withDestination(AUTH_PATHS.login, to)}>
          Back to sign in
        </Link>
      }
    >
      {setup.isPending && <SetupSkeleton />}
      {setup.isError && <SetupFailure error={setup.error} onRetry={() => void setup.refetch()} />}
      {setup.data && (
        <CodeForm verify={verify} isPending={isPending} submitLabel="Verify and continue">
          <AuthenticatorSetup setup={setup.data} />
        </CodeForm>
      )}
    </AuthLayout>
  );
}
