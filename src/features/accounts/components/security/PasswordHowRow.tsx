// PasswordHowRow: the "How" row of the three forms that give an account its first or a new password (the Password dialog, the Make an
// account dialog and +Add Account): a two-part switch, "Send a link | Temporary password", and a line saying what the chosen part does.
import { FormRow, YesNo } from '@/components/ui';
import type { PasswordMode } from '../../types';
import { howWords, isLinkMode, passwordHint, passwordModeOf } from './passwordModes';

export interface PasswordHowRowProps {
  /** The id of the switch: the row's label names it. Unique on the page. */
  id: string;
  value: PasswordMode;
  onChange: (mode: PasswordMode) => void;
  /** False for an account that never chose a password: the link is its invitation again. Default true. */
  hasPassword?: boolean;
  /** A missing permission (a temporary password needs `clients:security`): the switch is off, with the reason as its title. */
  lock?: { disabled: boolean; title?: string };
}

/** One label-left row. A switch that is off keeps the mode it has; the form starts on the link. */
export function PasswordHowRow({ id, value, onChange, hasPassword = true, lock }: PasswordHowRowProps) {
  const words = howWords(hasPassword);
  // A temporary password needs more than the form itself: say what is missing instead of leaving a switch that does nothing.
  const hint = passwordHint(value, hasPassword);
  const locked = lock?.disabled === true && lock.title ? ` ${lock.title} for a temporary password.` : '';
  return (
    <FormRow label="How" htmlFor={id} hint={`${hint}${locked}`}>
      <YesNo
        id={id}
        yes={words.link}
        no={words.temporary}
        value={isLinkMode(value)}
        onChange={(link) => onChange(passwordModeOf(link))}
        disabled={lock?.disabled}
        title={lock?.title}
      />
    </FormRow>
  );
}
