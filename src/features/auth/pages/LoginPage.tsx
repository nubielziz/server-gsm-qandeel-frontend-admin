// LoginPage: step 1 of sign-in (`/login`). No demo screen exists (MISMATCHES M5). It picks what to show: the form with a
// note above it, or, for a suspended account or a blocked address (`?reason=` or the server's answer), a screen of its own.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';
import { parseLoginReason } from '../components/loginReason';
import { SignInBlocked } from '../components/SignInBlocked';
import { SignInForm, type Refusal } from '../components/SignInForm';
import { SignInNotes } from '../components/SignInNotes';
import { useDestination } from '../hooks/useDestination';

export function LoginPage() {
  const [params] = useSearchParams();
  const reason = parseLoginReason(params.get('reason'));
  const { to } = useDestination();
  const [refusal, setRefusal] = useState<Refusal>();

  // The server's answer to this visit wins over a reason left in the address.
  const blocked = refusal ?? (reason === 'suspended' || reason === 'ip' ? { kind: reason } : undefined);
  if (blocked) {
    return (
      <SignInBlocked
        kind={blocked.kind}
        requestId={refusal?.requestId}
        onUseAnotherAccount={() => setRefusal(undefined)}
      />
    );
  }

  return (
    <AuthLayout
      title="Sign in"
      intro="Staff accounts only. A two-step code follows."
      footer="Forgot your password? Ask an owner to send you a reset link."
    >
      <SignInNotes reason={reason} to={to} />
      <SignInForm onBlocked={setRefusal} />
    </AuthLayout>
  );
}
