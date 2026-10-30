// SetPasswordForm: new password and its confirmation (POST /admin/auth/password/set through useChoosePassword), for
// an invite or reset link (with a token) or a temporary password (without one). Used by SetPasswordPage.
import { useRef, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { useChoosePassword } from '../hooks/useChoosePassword';
import { AuthButton } from './AuthButton';
import { mapSetPasswordError, type AuthErrorInfo } from './authErrors';
import { clearWhenFixed } from './clearWhenFixed';
import { FormAlert } from './FormAlert';
import { PasswordField } from './PasswordField';

/** The map's rule (decision 008): the server enforces it, the form only tells the user early. */
const MIN_PASSWORD_LENGTH = 10;

type PasswordForm = { password: string; confirm: string };
const FIELDS = ['password', 'confirm'] as const;
const LABELS: Record<(typeof FIELDS)[number], string> = {
  password: 'New password',
  confirm: 'Confirm password',
};

export interface SetPasswordFormProps {
  /** The invite or reset token from the link; undefined for a temporary password. */
  token: string | undefined;
  /** The link is dead (TOKEN_INVALID): the page swaps the form for a status card. */
  onDeadLink: (info: AuthErrorInfo) => void;
}

/**
 * Checks length and matching on submit and on leaving a field. A refused password (WEAK_PASSWORD or a field message)
 * shows under the new-password field; any other failure goes to the live summary.
 */
export function SetPasswordForm({ token, onDeadLink }: SetPasswordFormProps) {
  const { submit, isPending } = useChoosePassword();
  const [problem, setProblem] = useState<AuthErrorInfo>();
  const [invalid, setInvalid] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  // Set while a request runs: a second Enter or click before React re-renders must not send the form again.
  const sending = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    clearErrors,
    formState: { errors, submitCount },
  } = useForm<PasswordForm>({ defaultValues: { password: '', confirm: '' }, reValidateMode: 'onBlur' });

  function onInvalid(fieldErrors: FieldErrors<PasswordForm>) {
    setProblem(undefined);
    setInvalid(FIELDS.filter((field) => fieldErrors[field]).map((field) => LABELS[field]));
  }

  async function onValid({ password }: PasswordForm) {
    if (sending.current) return;
    sending.current = true;
    setProblem(undefined);
    setInvalid([]);
    const failure = await submit({ token, password });
    if (!failure) {
      // The sign-in screen is opening: keep the spinner (and the guard) until this one is gone.
      setLeaving(true);
      return;
    }
    sending.current = false;
    const mapped = mapSetPasswordError(failure);
    if (mapped.kind === 'token') onDeadLink(mapped.info);
    else if (mapped.kind === 'password') {
      setError('password', { type: 'server', message: mapped.message }, { shouldFocus: true });
      setInvalid([LABELS.password]);
    } else setProblem(mapped.info);
  }

  return (
    <form noValidate onSubmit={handleSubmit(onValid, onInvalid)}>
      <FormAlert key={submitCount} problem={problem} fields={invalid} />
      <div className="space-y-5">
        <PasswordField
          label={LABELS.password}
          autoComplete="new-password"
          autoFocus
          // The error already says it, so the hint steps aside rather than repeating the rule.
          hint={errors.password ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters.`}
          error={errors.password}
          {...clearWhenFixed(
            register('password', {
              required: 'Enter a new password.',
              minLength: {
                value: MIN_PASSWORD_LENGTH,
                message: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
              },
            }),
            (value) => value.length >= MIN_PASSWORD_LENGTH,
            () => errors.password && clearErrors('password'),
          )}
        />
        <PasswordField
          label={LABELS.confirm}
          autoComplete="new-password"
          error={errors.confirm}
          {...clearWhenFixed(
            register('confirm', {
              required: 'Enter the password again.',
              validate: (value) => value === getValues('password') || 'The two passwords do not match.',
            }),
            (value) => value !== '' && value === getValues('password'),
            () => errors.confirm && clearErrors('confirm'),
          )}
        />
      </div>
      <AuthButton type="submit" loading={isPending || leaving} className="mt-6">
        Set password
      </AuthButton>
    </form>
  );
}
