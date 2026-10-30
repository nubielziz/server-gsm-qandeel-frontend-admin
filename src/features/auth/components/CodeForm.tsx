// CodeForm: the code field and its submit button, shared by the two-step verification and first-time setup screens.
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { splitFieldError, type AuthErrorInfo } from './authErrors';
import { AUTH_FORM_CLASS } from './authForm';
import { CodeField } from './CodeField';
import { CODE_LENGTH } from './codeInput';
import { FormMessage } from './FormMessage';

export interface CodeFormProps {
  /** Sends the code. Resolves with the failure to show, or undefined when it worked (the hook then leaves the screen). */
  verify: (code: string) => Promise<Error | undefined>;
  isPending: boolean;
  submitLabel: string;
  /** Extra content above the field (the setup screen puts its QR code here). */
  children?: ReactNode;
}

export function CodeForm({ verify, isPending, submitLabel, children }: CodeFormProps) {
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [banner, setBanner] = useState<AuthErrorInfo>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setBanner(undefined);
    if (code.length !== CODE_LENGTH) {
      setFieldError(`Enter all ${CODE_LENGTH} digits of the code.`);
      inputRef.current?.focus();
      return;
    }
    setFieldError(undefined);
    const failure = await verify(code);
    if (!failure) return;
    const { field, banner: info } = splitFieldError(failure, 'code');
    setFieldError(field);
    setBanner(info);
    // Back into the field with the wrong code selected, so retyping replaces it.
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  return (
    <form noValidate className={AUTH_FORM_CLASS} onSubmit={onSubmit}>
      {banner && <FormMessage {...banner} />}
      {children}
      <CodeField ref={inputRef} value={code} onChange={setCode} error={fieldError} />
      <Button type="submit" variant="primary" className="w-full" loading={isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
