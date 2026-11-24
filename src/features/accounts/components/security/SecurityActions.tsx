// SecurityActions: the buttons of the Security part: Password…, Sign out everywhere, Reset two-step sign-in… and Resend verification email. The
// first three open the dialogs of the dialog host through `onAction` and take their offer from the action rules (the same words as the
// list's menu); "Resend" acts at once, needs `clients:security` and is off for an email that is verified already.
import { Button, FormRow, Icon } from '@/components/ui';
import { useResendAccountVerification } from '../../hooks/useSecurityMutations';
import type { AccountDetail } from '../../types';
import { actionOffer } from '../frame/actionRules';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { AccountAction, OpenAction } from '../types';

export interface SecurityActionsProps {
  account: AccountDetail;
  grants: AccountGrants;
  onAction: OpenAction;
}

/** The buttons and the line under them. A button an account cannot use is left out; one it may not use yet says why. */
export function SecurityActions({ account, grants, onAction }: SecurityActionsProps) {
  const resend = useResendAccountVerification();
  const lock = grants.needs('clients:security');
  const verified = Boolean(account.emailVerifiedAt);

  // One button per action of the host: drawn when the account is offered it, off with the reason when something is missing.
  const button = (action: AccountAction, label: string, icon: 'lock' | 'upload' | 'shield') => {
    const offer = actionOffer(action, account, grants);
    if (!offer.show) return null;
    return (
      <Button disabled={offer.disabled} title={offer.title} onClick={() => onAction(action, [account])}>
        <Icon name={icon} className="ic-sm" />
        {label}
      </Button>
    );
  };

  return (
    <FormRow
      label={null}
      hint="Passwords are stored as hashes. Nobody on your team can read a password, only replace it."
    >
      <div className="flex flex-wrap gap-2">
        {button('password', 'Password…', 'lock')}
        {button('signout', 'Sign out everywhere', 'upload')}
        {button('reset-2fa', 'Reset two-step sign-in…', 'shield')}
        <Button
          disabled={lock.disabled || verified}
          title={lock.title ?? (verified ? 'The email is already verified' : undefined)}
          loading={resend.isPending}
          onClick={() => resend.mutate(account)}
        >
          <Icon name="mail" className="ic-sm" />
          Resend verification email
        </Button>
      </div>
    </FormRow>
  );
}
