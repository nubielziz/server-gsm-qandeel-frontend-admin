// AuthStatusScreen: a calm status card in the sign-in shell, for a refusal that retyping cannot fix (a suspended
// account, an address that is not allowed, a dead set-password link): what is the matter, one next step, one action.
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui';
import { AuthShell } from './AuthShell';

export interface AuthStatusScreenProps {
  title: string;
  /** The symbol above the heading, so the card reads as a status at a glance. */
  icon: IconName;
  /** What is the matter, in one sentence. */
  body: ReactNode;
  /** What the person can do about it. */
  nextStep?: ReactNode;
  /** Support reference the server gave for the refusal, shown quietly under the action. */
  requestId?: string;
  /** The way out, usually a link back to the sign-in form (styled with authButtonClass). */
  action?: ReactNode;
}

/** Takes the focus to its heading on arrival: it replaces a form, so a screen reader should start at the news. */
export function AuthStatusScreen({ title, icon, body, nextStep, requestId, action }: AuthStatusScreenProps) {
  return (
    <AuthShell
      title={title}
      focusTitle
      icon={
        <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-warn-bg text-warn-fg">
          <Icon name={icon} />
        </span>
      }
      intro={
        <>
          <p>{body}</p>
          {nextStep && <p className="mt-2">{nextStep}</p>}
        </>
      }
    >
      {action}
      {requestId && (
        <p className="mt-4 text-xs text-ink3">
          Request <span className="font-mono">{requestId}</span>
        </p>
      )}
    </AuthShell>
  );
}
