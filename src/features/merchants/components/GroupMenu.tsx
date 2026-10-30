// GroupMenu: the "Group: VIP" button on a merchant's page and the menu that moves the merchant to another price group. Ports the
// `m-group-menu` action of 42-p-merchants.js. The retail group of the storefront is not offered. Needs `clients:update` for the
// change and `groups:read` to list the groups.
import { Button, Icon, Menu, usePopover, type MenuItem } from '@/components/ui';
import { useChangeGroup } from '../hooks/useClientMutations';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { groupLabel, merchantGroups } from '../lib/groups';
import type { Client, ClientGroup } from '../types';

export interface GroupMenuProps {
  client: Client;
  /** The groups to offer; `undefined` when they cannot be read. */
  groups: readonly ClientGroup[] | undefined;
  /** The groups are still loading: the menu waits instead of opening empty. */
  groupsLoading?: boolean;
  grants: MerchantGrants;
}

/** A button with a menu of groups. Choosing another group moves the merchant at once. */
export function GroupMenu({ client, groups, groupsLoading = false, grants }: GroupMenuProps) {
  const pop = usePopover();
  const change = useChangeGroup();
  const updateLock = grants.needs('clients:update');
  const lock = updateLock.disabled
    ? updateLock
    : groupsLoading
      ? { disabled: true as const, title: 'Loading the groups…' }
      : groups
        ? { disabled: false as const, title: undefined }
        : { disabled: true as const, title: 'You need the groups:read permission to list the groups' };

  const items: MenuItem[] = merchantGroups(groups ?? []).map((group) => ({
    label: groupLabel(group),
    checked: group.id === client.groupId,
    run: () => {
      if (group.id !== client.groupId) change.mutate({ client, group });
    },
  }));

  return (
    <>
      <Button
        ref={pop.anchorRef}
        aria-haspopup="menu"
        aria-expanded={pop.open}
        disabled={lock.disabled}
        title={lock.title}
        loading={change.isPending}
        onClick={pop.toggle}
      >
        <Icon name="tag" className="ic-sm" />
        Group: {client.group?.name ?? '–'}
        <Icon name="chevD" className="ic-xs" />
      </Button>
      <Menu {...pop.panelProps} items={items} width={220} align="start" label="Merchant group" />
    </>
  );
}
