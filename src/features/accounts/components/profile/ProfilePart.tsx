// ProfilePart: the "Profile" part of a record: name, email, phone, country, company, address, tax number and internal notes in label-left
// rows with the pinned "Save". It is the one part of the record that is a form; it re-hosts the old edit dialogs of the merchant and the
// customer (their form logic is profileForm.ts).
import { PartForm } from '@/components/ui';
import type { AccountPartProps } from '../types';
import { ProfileFields } from './ProfileFields';
import { useProfileForm } from './useProfileForm';

/**
 * The Profile part. Saving needs `clients:update`: without it every box is off and the bar says why. The email of a login account also
 * needs `clients:security` (changing it sends a verification link): without it the box is read-only. The part reports its unsaved changes
 * to the record, which asks before another part or view is opened.
 *
 * @param props the part contract: the account, the grants and the unsaved mark
 */
export function ProfilePart({ account, grants, onDirtyChange }: AccountPartProps) {
  const lock = grants.needs('clients:update');
  // A guest's email carries no sign-in: only the email of a login account needs the security permission.
  const emailLock = account.hasAccount ? grants.needs('clients:security') : { disabled: false };
  const { form, submit, dirty } = useProfileForm(account, { email: emailLock.disabled }, onDirtyChange);
  return (
    <PartForm label="Profile" onSubmit={submit} dirty={dirty} lock={lock}>
      <ProfileFields form={form} account={account} lock={lock} emailLock={emailLock} />
    </PartForm>
  );
}
