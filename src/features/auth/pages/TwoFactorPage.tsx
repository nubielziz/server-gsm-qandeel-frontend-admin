// TwoFactorPage: step 2 of sign-in, the 6-digit authenticator code (`/login/2fa`). No demo screen exists (MISMATCHES M5).
import { AuthShell } from '../components/AuthShell';
import { BackToSignIn } from '../components/BackToSignIn';
import { CodeForm } from '../components/CodeForm';
import { useCodeStep } from '../hooks/useCodeStep';

/** The code form and one way back, to the sign-in form. */
export function TwoFactorPage() {
  const { verify, isPending } = useCodeStep();
  return (
    <AuthShell
      title="Two-step verification"
      intro="Enter the 6-digit code from your authenticator app."
      footer={<BackToSignIn />}
    >
      <CodeForm verify={verify} isPending={isPending} submitLabel="Verify" />
    </AuthShell>
  );
}
