// SecurityPart: the "Security" part of a record (accounts with a login): how the account signs in and the staff tools around it. Read-only
// rows, then the buttons; every change goes through a dialog of the dialog host (password, sign out, reset two-step sign-in) or is one
// click (resend the verification email). No pinned bar: nothing here is saved by a button of its own.
import { SectionHeading } from '@/components/ui';
import { useNow } from '@/lib/format';
import type { AccountPartProps } from '../types';
import { SecurityActions } from './SecurityActions';
import { SecurityFacts } from './SecurityFacts';

/**
 * The Security part.
 *
 * Why: staff help an account that is locked out or compromised: they see the sign-in facts the server worked out and replace a password,
 * end sessions, turn two-step sign-in off or send the verification email again (the map's security routes, `clients:security`).
 * Side effects: none while it is only read (the facts are `security` of the record the page has read from `GET /admin/clients/:id`);
 * each button's own request is named by its dialog.
 */
export function SecurityPart({ account, grants, onAction }: AccountPartProps) {
  const now = useNow();
  return (
    <div className="view-frame">
      <div>
        <SectionHeading as="h3">Sign-in</SectionHeading>
        <SecurityFacts account={account} grants={grants} now={now} />
        <SectionHeading as="h3">Manage sign-in</SectionHeading>
        <SecurityActions account={account} grants={grants} onAction={onAction} />
      </div>
    </div>
  );
}
