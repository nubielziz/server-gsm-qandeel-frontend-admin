// The merchant groups (a Refine list) and the actions on them. The groups are few, so they are read whole: the Groups tab, the
// group filter, the group menu and the invite dialog share one cached read.
import { useList } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { createClientGroup, deleteClientGroup, updateClientGroup } from '../api';
import type { ClientGroup, CreateClientGroupBody, UpdateClientGroupBody } from '../types';
import { CLIENT_STALE_KEYS, LIST_CAP } from './keys';

/** The groups in the order the server keeps them (`sort`). Pass `enabled: false` while the staff member lacks `groups:read`. */
export function useClientGroups(enabled = true) {
  const { result, query } = useList<ClientGroup>({
    resource: 'client-groups',
    pagination: { currentPage: 1, pageSize: LIST_CAP },
    sorters: [{ field: 'sort', order: 'asc' }],
    queryOptions: { enabled },
    // Each place that shows groups has its own error state, so Refine's default toast would only repeat it.
    errorNotification: false,
  });
  return { groups: result.data, total: result.total, query };
}

const NO_ERROR_TOAST = () => false as const;

// A change of a group also changes what merchant rows say about it (name, discount, counts), and the tab counts.
const groupsAndMerchants = (id?: number) => [{ resource: 'client-groups', id }, { resource: 'clients' }];

/** Creates a group. */
export function useCreateGroup() {
  return useApiMutation({
    mutationFn: (body: CreateClientGroupBody) => createClientGroup(body),
    invalidates: groupsAndMerchants(),
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (group) => ({
      message: `${group.name} group created`,
      description: 'Move merchants into it from their page.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a group; a new discount applies to the next order of its merchants. */
export function useUpdateGroup() {
  return useApiMutation({
    mutationFn: ({ group, body }: { group: ClientGroup; body: UpdateClientGroupBody }) =>
      updateClientGroup(group.id, body),
    invalidates: (_updated, { group }) => groupsAndMerchants(group.id),
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_updated, { group, body }) => ({
      message: `${body.name ?? group.name} group updated`,
      description: 'The change applies to the next order of its merchants.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Deletes a group; the server refuses while merchants are still in it. */
export function useDeleteGroup() {
  return useApiMutation({
    mutationFn: (group: ClientGroup) => deleteClientGroup(group.id),
    invalidates: (_result, group) => groupsAndMerchants(group.id),
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_result, group) => ({ message: `${group.name} group deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
