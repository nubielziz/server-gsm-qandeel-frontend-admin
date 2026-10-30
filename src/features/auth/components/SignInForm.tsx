// SignInForm: the email and password form of `/login` (step 1 of sign-in). The page decides what surrounds it.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, TextField } from '@/components/ui';
import { applyServerErrors, isApiError } from '@/lib/api';
import { useCredentialsStep } from '../hooks/useCredentialsStep';
import { AUTH_FORM_CLASS } from './authForm';
import { blockedKindOf, describeAuthError, type AuthErrorInfo, type BlockedKind } from './authErrors';
import { FormMessage } from './FormMessage';
import { PasswordField } from './PasswordField';

type Credentials = { email: string; password: string };
const FIELDS = ['email', 'password'] as const;

/** A refusal that needs the whole screen: which one, and the request ID to quote. */
export type Refusal = { kind: BlockedKind; requestId?: string };

export function SignInForm({ onBlocked }: { onBlocked: (refusal: Refusal) => void }) {
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
    const kind = blockedKindOf(failure);
    if (kind) {
      // Suspended account or blocked address: retyping cannot help, so the page swaps the form for its own screen.
      onBlocked({ kind, requestId: isApiError(failure) ? failure.requestId : undefined });
      return;
    }
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
    <form noValidate className={AUTH_FORM_CLASS} onSubmit={handleSubmit(onSubmit)}>
      {banner && <FormMessage {...banner} />}
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        autoFocus
        error={errors.email}
        {...register('email', { required: 'Enter your email.' })}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        error={errors.password}
        {...register('password', { required: 'Enter your password.' })}
      />
      <Button type="submit" variant="primary" className="w-full" loading={isPending}>
        Sign in
      </Button>
    </form>
  );
}
