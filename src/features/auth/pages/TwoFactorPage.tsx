// TwoFactorPage: step 2 of sign-in, the 6-digit authenticator code (`/login/2fa`). No demo screen exists (MISMATCHES M5).
import { Link } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';
import { CodeForm } from '../components/CodeForm';
import { withDestination } from '../destination';
import { useCodeStep } from '../hooks/useCodeStep';
import { useDestination } from '../hooks/useDestination';
import { AUTH_PATHS } from '../paths';

export function TwoFactorPage() {
  const { verify, isPending } = useCodeStep();
  const { to } = useDestination();
  return (
    <AuthLayout
      title="Two-step verification"
      intro="Open your authenticator app and enter the code for GSM Supply."
      footer={
        <Link className="link" to={withDestination(AUTH_PATHS.login, to)}>
          Back to sign in
        </Link>
      }
    >
      <CodeForm verify={verify} isPending={isPending} submitLabel="Verify" />
    </AuthLayout>
  );
}
