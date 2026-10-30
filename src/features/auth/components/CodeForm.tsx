// CodeForm: the code form shared by the two-step screens (POST /admin/auth/2fa through useCodeStep). The setup screen
// puts its QR code and key above the field.
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AuthButton } from './AuthButton';
import { splitFieldError, type AuthErrorInfo } from './authErrors';
import { CodeField } from './CodeField';
import { CODE_LENGTH } from './codeInput';
import { FormAlert } from './FormAlert';

export interface CodeFormProps {
  /** Sends the code. Resolves with the failure to show, or undefined when it worked (the hook then leaves the screen). */
  verify: (code: string) => Promise<Error | undefined>;
  isPending: boolean;
  submitLabel: string;
  /** Extra content above the field (the setup screen puts its QR code here). */
  children?: ReactNode;
}

/**
 * Checks the length before calling the server. A wrong code shows under the field with the code selected, so typing
 * replaces it; any other failure goes to the live summary.
 */
export function CodeForm({ verify, isPending, submitLabel, children }: CodeFormProps) {
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [problem, setProblem] = useState<AuthErrorInfo>();
  const [attempt, setAttempt] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // Set while a request runs: a second Enter or click before React re-renders must not send the code again.
  const sending = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    setAttempt((count) => count + 1);
    setProblem(undefined);
    if (code.length !== CODE_LENGTH) {
      setFieldError(`Enter all ${CODE_LENGTH} digits of the code.`);
      inputRef.current?.focus();
      return;
    }
    setFieldError(undefined);
    sending.current = true;
    const failure = await verify(code);
    if (!failure) {
      // Signed in: keep the spinner (and the guard) until the console opens.
      setLeaving(true);
      return;
    }
    sending.current = false;
    const { field, banner } = splitFieldError(failure, 'code');
    setFieldError(field);
    setProblem(banner);
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)}>
      <FormAlert key={attempt} problem={problem} fields={fieldError ? ['Authentication code'] : []} />
      {children && <div className="mb-6">{children}</div>}
      <CodeField ref={inputRef} value={code} onChange={setCode} error={fieldError} />
      <AuthButton type="submit" loading={isPending || leaving} className="mt-6">
        {submitLabel}
      </AuthButton>
    </form>
  );
}
