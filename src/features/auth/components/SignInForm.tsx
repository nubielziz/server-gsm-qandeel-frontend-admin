// SignInForm: the email-and-password step of signing in (POST /admin/auth/login through useCredentialsStep). Checks
// the fields on submit and when the person leaves a field, never on each keystroke. After a failure the email stays
// and only the password is cleared.
import { useId, useRef, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { hintId } from '@/components/ui/fieldA11y';
import { applyServerErrors, isApiError } from '@/lib/api';
import { useCredentialsStep } from '../hooks/useCredentialsStep';
import { AuthButton } from './AuthButton';
import { AuthField } from './AuthField';
import { blockedKindOf, describeSignInFailure, type AuthErrorInfo, type BlockedKind } from './authErrors';
import { clearWhenFixed } from './clearWhenFixed';
import { FormAlert } from './FormAlert';
import { FORGOT_PASSWORD_NOTE, ForgotPasswordToggle } from './ForgotPassword';
import { PasswordField } from './PasswordField';

type Credentials = { email: string; password: string };
const FIELDS = ['email', 'password'] as const;
const LABELS: Record<(typeof FIELDS)[number], string> = { email: 'Email', password: 'Password' };

/** A light format check (something@something), so a typo is caught before a round trip. The server decides. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

/** Whether an email passes the form's checks; spaces around it do not count (the form trims them on submit). */
function emailLooksRight(value: string): boolean {
  return EMAIL_SHAPE.test(value.trim());
}

/** A refusal that gets its own screen (suspended account, blocked address), with the server's request id. */
export type Refusal = { kind: BlockedKind; requestId?: string };

/**
 * The form. A wrong pair, a rate limit or a network failure goes to the live summary; the server's field messages go
 * under their fields; a suspended account or a blocked address hands over to the page through `onBlocked`.
 */
export function SignInForm({ onBlocked }: { onBlocked: (refusal: Refusal) => void }) {
  const { submit, isPending } = useCredentialsStep();
  const [problem, setProblem] = useState<AuthErrorInfo>();
  const [invalid, setInvalid] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  // Set while a request runs: a second Enter or click before React re-renders must not send the form again.
  const sending = useRef(false);
  const passwordId = useId();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    resetField,
    clearErrors,
    formState: { errors, submitCount },
  } = useForm<Credentials>({ defaultValues: { email: '', password: '' }, reValidateMode: 'onBlur' });

  function onInvalid(fieldErrors: FieldErrors<Credentials>) {
    setProblem(undefined);
    setInvalid(FIELDS.filter((field) => fieldErrors[field]).map((field) => LABELS[field]));
  }

  async function onValid(values: Credentials) {
    if (sending.current) return;
    sending.current = true;
    setProblem(undefined);
    setInvalid([]);
    const failure = await submit({ email: values.email.trim(), password: values.password });
    if (!failure) {
      // The next screen is opening: keep the spinner (and the guard) until this one is gone.
      setLeaving(true);
      return;
    }
    sending.current = false;
    const kind = blockedKindOf(failure);
    if (kind) {
      // Suspended account or blocked address: retyping cannot help, so the page swaps the form for its own screen.
      onBlocked({ kind, requestId: isApiError(failure) ? failure.requestId : undefined });
      return;
    }
    if (isApiError(failure) && Object.keys(failure.fieldErrors).length > 0) {
      // The server named the fields: its messages go under them, and the rest (if any) into the summary.
      const rest = applyServerErrors(failure, setError, { fields: FIELDS });
      setInvalid(FIELDS.filter((field) => failure.fieldErrors[field]?.length).map((field) => LABELS[field]));
      if (rest.length > 0)
        setProblem({ title: failure.title, detail: rest.join(' '), requestId: failure.requestId });
      return;
    }
    setProblem(describeSignInFailure(failure));
    resetField('password');
    setFocus('password');
  }

  return (
    <form noValidate onSubmit={handleSubmit(onValid, onInvalid)}>
      <FormAlert key={submitCount} problem={problem} fields={invalid} />
      <div className="space-y-5">
        <AuthField
          label="Email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          error={errors.email}
          {...clearWhenFixed(
            register('email', {
              required: 'Enter your email.',
              validate: (value) =>
                emailLooksRight(value) || 'Enter an email address such as name@company.com.',
            }),
            emailLooksRight,
            () => errors.email && clearErrors('email'),
          )}
        />
        <PasswordField
          id={passwordId}
          label="Password"
          autoComplete="current-password"
          labelAside={
            <ForgotPasswordToggle
              open={forgotOpen}
              controls={hintId(passwordId)}
              onToggle={() => setForgotOpen((open) => !open)}
            />
          }
          hint={forgotOpen ? FORGOT_PASSWORD_NOTE : undefined}
          error={errors.password}
          {...clearWhenFixed(
            register('password', { required: 'Enter your password.' }),
            (value) => value !== '',
            () => errors.password && clearErrors('password'),
          )}
        />
      </div>
      <AuthButton type="submit" loading={isPending || leaving} className="mt-6">
        Sign in
      </AuthButton>
    </form>
  );
}
