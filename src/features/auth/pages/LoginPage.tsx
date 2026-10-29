// LoginPage: step 1 of sign-in, email and password (`/login`). No demo screen exists (MISMATCHES M5); the reason
// banners cover the account being suspended, the IP being blocked and a password that was just changed.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { Button, TextField } from '@/components/ui';
import { applyServerErrors, isApiError } from '@/lib/api';
import { AuthLayout } from '../components/AuthLayout';
import { describeAuthError, type AuthErrorInfo } from '../components/authErrors';
import { FormMessage } from '../components/FormMessage';
import { parseLoginReason } from '../components/loginReason';
import { ReasonBanner } from '../components/ReasonBanner';
import { useCredentialsStep } from '../hooks/useCredentialsStep';

type Credentials = { email: string; password: string };
const FIELDS = ['email', 'password'] as const;

export function LoginPage() {
  const [params] = useSearchParams();
  const reason = parseLoginReason(params.get('reason'));
  const { submit, isPending } = useCredentialsStep();
  const [banner, setBanner] = useState<AuthErrorInfo>();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<Credentials>({ defaultValues: { email: '', password: '' } });

  async function onSubmit(values: Credentials) {
    setBanner(undefined);
    const failure = await submit({ email: values.email.trim(), password: values.password });
    if (!failure) return;
    if (isApiError(failure) && Object.keys(failure.fieldErrors).length > 0) {
      // The server named the fields: show its messages under them, and the rest (if any) in the banner.
      const rest = applyServerErrors(failure, setError, { fields: FIELDS });
      if (rest.length > 0)
        setBanner({ title: failure.title, detail: rest.join(' '), requestId: failure.requestId });
      return;
    }
    setBanner(describeAuthError(failure));
    setFocus('password', { shouldSelect: true });
  }

  return (
    <AuthLayout
      title="Sign in"
      intro="Use your GSM Supply staff account."
      footer="Forgot your password? Ask an owner to send you a reset link."
    >
      <ReasonBanner reason={reason} />
      <form noValidate className="space-y-3.5" onSubmit={handleSubmit(onSubmit)}>
        {banner && <FormMessage {...banner} />}
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          autoFocus
          error={errors.email}
          {...register('email', { required: 'Enter your email.' })}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          {...register('password', { required: 'Enter your password.' })}
        />
        <Button type="submit" variant="primary" className="w-full" loading={isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
