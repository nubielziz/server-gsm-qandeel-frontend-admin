// ForgotPasswordToggle: "Forgot your password?" on the password label's row of the sign-in form. The API has no
// self-service reset route, so it opens a short note (who can send a reset link) instead of leading anywhere.

/** The note it opens, shown as the password field's hint. */
export const FORGOT_PASSWORD_NOTE = 'Ask an Owner to send you a reset link.';

export interface ForgotPasswordToggleProps {
  open: boolean;
  /** Id of the note it shows and hides. */
  controls: string;
  onToggle: () => void;
}

/** A disclosure button styled as a link; its hit area reaches 44px tall without moving the label row. */
export function ForgotPasswordToggle({ open, controls, onToggle }: ForgotPasswordToggleProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      // Only while open: the note is not in the page when closed.
      aria-controls={open ? controls : undefined}
      onClick={onToggle}
      className="relative rounded-sm text-sm font-medium text-accent-ink underline-offset-2 after:absolute after:-inset-x-2 after:-inset-y-3 hover:underline"
    >
      Forgot your password?
    </button>
  );
}
