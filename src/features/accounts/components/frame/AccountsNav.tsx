// AccountsNav: the two rows of links under the page title: the strip of populations (level 1) and the text links of the views (level 2).
// It only draws what `accountsNav` works out. The strip is drawn only for a role that may use the All view; every link is a full view
// of the page (no dialog, no side panel).
import { StripTabs, ViewLinks } from '@/components/ui';
import { useAccountCounts } from '../../hooks/useAccountCounts';
import { useOpenRequestCount } from '../../hooks/useDataRequests';
import type { ListAddress } from '../list/listAddress';
import type { AccountsViewId, AccountsViewSpec } from '../types';
import { currentLink, stripCurrent, stripItems, viewItems } from './accountsNav';
import { lastListLink } from './lastListAddress';
import type { AccountGrants } from './useAccountGrants';

export interface AccountsNavProps {
  grants: AccountGrants;
  /** The views the role may use. */
  usable: readonly AccountsViewSpec[];
  /** The view on screen; on a record it is `all` (the record belongs to the list). */
  view: AccountsViewId;
  /** The list's population (the strip's raised tab on the All view). */
  chip: ListAddress['chip'];
  /** The open account, when a record is on screen: its tab is added to the strip and raised. */
  record?: { id: number; label: string };
  /** A record is on screen, loaded or not: no population is raised while its tab is not there yet. */
  onRecord?: boolean;
}

/** The strip of populations, then the row of views. */
export function AccountsNav({
  grants,
  usable,
  view,
  chip,
  record,
  onRecord = record !== undefined,
}: AccountsNavProps) {
  const canList = grants.can('clients:read');
  const counts = useAccountCounts(canList);
  const requests = useOpenRequestCount(grants.canAll(['clients:read', 'customers:privacy']));
  return (
    <>
      {canList && (
        <StripTabs
          items={stripItems(counts.data, { linkOf: lastListLink, record })}
          current={stripCurrent(view, { chip }, onRecord)}
          ariaLabel="Accounts shown"
        />
      )}
      <ViewLinks items={viewItems(usable, requests.data)} current={currentLink(view)} ariaLabel="Views" />
    </>
  );
}
