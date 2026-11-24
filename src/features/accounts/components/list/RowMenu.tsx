// RowMenu: the "…" menu at the end of a row of the list: Open · Adjust wallet… · Change rank… (the Owner) · Suspend… or
// Reactivate… · Send a password link · Sign out everywhere · Make an account… (guests). What a row is offered comes from the action rules
// (a control that cannot apply is left out, or disabled with its reason); nothing here moves money in bulk or on its own: the dialogs ask.
import { useNavigate } from 'react-router';
import { Button, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import { accountPath } from '../../lib/paths';
import type { AccountRow } from '../../types';
import { actionOffer } from '../frame/actionRules';
import type { AccountGrants } from '../frame/useAccountGrants';
import { accountLabel } from '../shared/accountLabel';
import type { AccountAction, OpenAction } from '../types';
import { useSendPasswordLink } from './useSendPasswordLink';

export interface RowMenuProps {
  account: AccountRow;
  grants: AccountGrants;
  onAction: OpenAction;
}

/** The trigger and the menu of one row. */
export function RowMenu({ account, grants, onAction }: RowMenuProps) {
  const pop = usePopover();
  const navigate = useNavigate();
  const sendLink = useSendPasswordLink();
  const name = accountLabel(account);

  // One item for an action the rules offer to this account; none for one they leave out.
  const item = (action: AccountAction, label: string, run: () => void): MenuItem[] => {
    const offer = actionOffer(action, account, grants);
    return offer.show ? [{ label, disabled: offer.disabled, title: offer.title, run }] : [];
  };
  const dialog = (action: AccountAction, label: string) =>
    item(action, label, () => onAction(action, [account]));

  const items: MenuItem[] = [
    { label: 'Open', run: () => void navigate(accountPath(account.id)) },
    ...dialog('adjust', 'Adjust wallet…'),
    ...dialog('rank', 'Change rank…'),
    ...dialog('suspend', 'Suspend…'),
    ...dialog('reactivate', 'Reactivate…'),
    ...item('password', 'Send a password link', () => sendLink.mutate(account)),
    ...dialog('signout', 'Sign out everywhere'),
    ...dialog('make-account', 'Make an account…'),
  ];

  return (
    <>
      <Button
        ref={pop.anchorRef}
        size="sm"
        variant="ghost"
        icon
        aria-label={`More actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="more" className="ic-sm" />
      </Button>
      <Menu {...pop.panelProps} items={items} label={`Actions for ${name}`} align="end" />
    </>
  );
}
