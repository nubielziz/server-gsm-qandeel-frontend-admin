// SetPasswordPage: choose a password from an invite or reset link (`/set-password?token=…`), or replace a temporary
// password right after signing in (no token). No demo screen exists (MISMATCHES M5).
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { Button } from '@/components/ui';
import { AuthLayout } from '../components/AuthLayout';
import { AUTH_FORM_CLASS } from '../components/authForm';
import { mapSetPasswordError, type AuthErrorInfo } from '../components/authErrors';
import { FormMessage } from '../components/FormMessage';
import { NoticeBanner } from '../components/NoticeBanner';
import { PasswordField } from '../components/PasswordField';
import { withDestination } from '../destination';
import { useChoosePassword } from '../hooks/useChoosePassword';
import { useDestination } from '../hooks/useDestination';
import { AUTH_PATHS } from '../paths';

/** The map's rule (decision 008): the server enforces it, the form only tells the user early. */
const MIN_PASSWORD_LENGTH = 10;

type PasswordForm = { password: string; confirm: string };

export function SetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? undefined;
  const { to } = useDestination();
  const { submit, isPending } = useChoosePassword();
  const [banner, setBanner] = useState<AuthErrorInfo>();
  const [deadLink, setDeadLink] = useState<AuthErrorInfo>();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<PasswordForm>({ defaultValues: { password: '', confirm: '' } });

  async function onSubmit({ password }: PasswordForm) {
    setBanner(undefined);
    const failure = await submit({ token, password });
    if (!failure) return;
    const mapped = mapSetPasswordError(failure);
    if (mapped.kind === 'token') setDeadLink(mapped.info);
    else if (mapped.kind === 'password') {
      setError('password', { type: 'server', message: mapped.message }, { shouldFocus: true });
    } else setBanner(mapped.info);
  }

  return (
    <AuthLayout
      title="Choose a password"
      intro={
        deadLink
          ? undefined
          : token
            ? 'Choose the password you will use to sign in.'
            : 'Your password is temporary. Choose a new one to continue.'
      }
      footer={
        <Link className="link" to={withDestination(AUTH_PATHS.login, to)}>
          Back to sign in
        </Link>
      }
    >
      {deadLink ? (
        // The link cannot work any more, so retyping is pointless: the form gives way to the explanation.
        <NoticeBanner tone="crit" icon="alert" title={deadLink.title}>
          {deadLink.detail}
        </NoticeBanner>
      ) : (
        <form noValidate className={AUTH_FORM_CLASS} onSubmit={handleSubmit(onSubmit)}>
          {banner && <FormMessage {...banner} />}
          <PasswordField
            label="New password"
            autoComplete="new-password"
            autoFocus
            // The error already says it, so the hint steps aside rather than repeating the rule.
            hint={errors.password ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters.`}
            error={errors.password}
            {...register('password', {
              required: 'Enter a new password.',
              minLength: {
                value: MIN_PASSWORD_LENGTH,
                message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
              },
            })}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            error={errors.confirm}
            {...register('confirm', {
              required: 'Enter the password again.',
              validate: (value) => value === getValues('password') || 'The two passwords do not match.',
            })}
          />
          <Button type="submit" variant="primary" className="w-full" loading={isPending}>
            Set password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
