// SetupTwoFactorPage: first sign-in, scan the QR code (or type the key) and confirm with the first code
// (`/login/setup-2fa`). No demo screen exists (MISMATCHES M5).
import { Skeleton } from '@/components/ui';
import { AuthenticatorSetup } from '../components/AuthenticatorSetup';
import { AuthShell } from '../components/AuthShell';
import { BackToSignIn } from '../components/BackToSignIn';
import { CodeForm } from '../components/CodeForm';
import { SetupFailure } from '../components/SetupFailure';
import { useCodeStep } from '../hooks/useCodeStep';
import { useTwoFactorSetup } from '../hooks/useTwoFactorSetup';

/** Stand-in for the QR code and the key while the server prepares them, at their final size (no jump). */
function SetupSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Preparing your setup key">
      <Skeleton width={176} height={176} className="mx-auto rounded-lg" />
      <Skeleton height={62} className="rounded-lg" />
    </div>
  );
}

/** The setup key (loading, failure with Retry, or the QR code and key), then the first code. */
export function SetupTwoFactorPage() {
  const setup = useTwoFactorSetup();
  const { verify, isPending } = useCodeStep();
  return (
    <AuthShell
      title="Set up two-step verification"
      intro="Every staff account needs an authenticator app. Scan the code with it, then enter the 6 digits it shows."
      footer={<BackToSignIn />}
    >
      {setup.isPending && <SetupSkeleton />}
      {setup.isError && <SetupFailure error={setup.error} onRetry={() => void setup.refetch()} />}
      {setup.data && (
        <CodeForm verify={verify} isPending={isPending} submitLabel="Verify and continue">
          <AuthenticatorSetup setup={setup.data} />
        </CodeForm>
      )}
    </AuthShell>
  );
}
