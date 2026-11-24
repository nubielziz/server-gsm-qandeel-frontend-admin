// AddAccountView: the "+Add Account" view of the Accounts page: one label-left form that ends in the pinned "Add" bar. Adding sends the person a
// link to choose a password, or shows a temporary password once; either way the new account then opens on its Security part. A merchant rank is
// the Owner's to give. Leaving the form with typing in it asks first.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  PinnedBar,
  SectionHeading,
  UnsavedGuard,
  useDirtyMark,
  useReportDirty,
} from '@/components/ui';
import { RevealPasswordDialog } from '@/features/access';
import { accountLabel } from '@/lib/format';
import { useRanks } from '../../hooks/useRanks';
import { accountPath } from '../../lib/paths';
import type { CreateAccountResult } from '../../types';
import type { AccountsViewProps } from '../types';
import { AddAccountFields } from './AddAccountFields';
import { useAddAccountForm } from './useAddAccountForm';

/** The new account whose temporary password is on screen. */
type Shown = { id: number; name: string; password: string };

/**
 * The view. "Add" needs `clients:create` (the registry shows the view only to a role that has it); the Owner rule, `wallet:credit_limit`
 * and `clients:security` lock their own rows. A refusal that names a field shows under it; the rest shows beside the button.
 *
 * Why: staff add an account on request (a merchant invited by the team, a shop customer signed up by phone): the map's create route.
 * Side effects: one create request to `POST /admin/clients` (the API function owns the route tag); then the new account's page is opened on Security.
 */
export function AddAccountView({ grants }: AccountsViewProps) {
  const navigate = useNavigate();
  const ranks = useRanks(grants.can('groups:read'));
  const [shown, setShown] = useState<Shown | null>(null);
  const [done, setDone] = useState(false);

  const { form, submit, pending, problem, reset } = useAddAccountForm({
    ranks: ranks.ranks,
    creditAllowed: grants.can('wallet:credit_limit'),
    onAdded: (created: CreateAccountResult) => {
      setDone(true);
      const { temporaryPassword } = created;
      // The answer holds the password: let go of it at once, the dialog keeps the one copy.
      reset();
      if (temporaryPassword)
        setShown({ id: created.id, name: accountLabel(created), password: temporaryPassword });
      else void navigate(accountPath(created.id, 'security'));
    },
  });

  // Typing is lost when the view is left: the guard asks first, and the browser asks before a reload. Once the account is added nothing is.
  const mark = useDirtyMark('add-account');
  useReportDirty(form.formState.isDirty && !done, mark.report);

  const lock = grants.needs('clients:create');
  return (
    <>
      <form className="view-frame" noValidate onSubmit={(event) => void submit(event)}>
        <div>
          <SectionHeading>Add Account</SectionHeading>
          <AddAccountFields form={form} grants={grants} ranks={ranks} />
        </div>
        <PinnedBar>
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            disabled={lock.disabled || done}
            title={lock.title}
          >
            Add
          </Button>
          {lock.disabled && lock.title && <span className="text-xs text-ink3">{lock.title}</span>}
          {problem && (
            <span role="alert" className="text-sm text-crit-fg">
              {problem}
            </span>
          )}
        </PinnedBar>
      </form>
      <UnsavedGuard active={mark.dirty} what="Add Account" />
      {shown && (
        <RevealPasswordDialog
          name={shown.name}
          password={shown.password}
          onClose={() => void navigate(accountPath(shown.id, 'security'))}
        />
      )}
    </>
  );
}
