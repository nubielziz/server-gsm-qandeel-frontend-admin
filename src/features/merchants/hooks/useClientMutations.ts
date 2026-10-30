// The actions on a merchant account, each with the toast the demo showed and the reads it makes stale. The buttons that act at
// once (approve, reactivate, move to a group) let the default error toast show the server's refusal; the dialogs (invite,
// suspend, credit limit) show a failed call themselves, in the error slot or under the field the server named.
import { useApiMutation, DASHBOARD_KEY } from '@/lib/query';
import { createClient, setClientCreditLimit, updateClient } from '../api';
import { money } from '@/lib/format';
import type { Client, ClientGroup, CreateClientBody } from '../types';
import { CLIENT_STALE_KEYS, staleClient, WALLET_KEY } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** The part of a merchant the toasts and requests need. */
type Target = Pick<Client, 'id' | 'name'>;

/** Approves a pending merchant: they can order once they fund their wallet. Ports `m-approve`. */
export function useApproveClient() {
  return useApiMutation({
    mutationFn: (client: Target) => updateClient(client.id, { status: 'active' }),
    invalidates: (_updated, client) => staleClient(client.id),
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_updated, client) => ({
      message: `${client.name} approved`,
      description: 'They can place orders once they fund their wallet.',
    }),
  });
}

/** Lets a suspended merchant order again. Ports `m-reactivate`. */
export function useReactivateClient() {
  return useApiMutation({
    mutationFn: (client: Target) => updateClient(client.id, { status: 'active' }),
    invalidates: (_updated, client) => staleClient(client.id),
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_updated, client) => ({ message: `${client.name} reactivated` }),
  });
}

/** Suspends a merchant with a reason for the audit log. Ports `m-suspend`. */
export function useSuspendClient() {
  return useApiMutation({
    mutationFn: ({ client, reason }: { client: Target; reason: string }) =>
      updateClient(client.id, { status: 'suspended', reason }),
    invalidates: (_updated, { client }) => staleClient(client.id),
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_updated, { client }) => ({ message: `${client.name} suspended` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Moves a merchant to another price group; new orders use the new prices. Ports `m-group-menu`. */
export function useChangeGroup() {
  return useApiMutation({
    mutationFn: ({ client, group }: { client: Target; group: Pick<ClientGroup, 'id' | 'name'> }) =>
      updateClient(client.id, { groupId: group.id }),
    invalidates: (_updated, { client }) => [...staleClient(client.id), { resource: 'client-groups' }],
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_updated, { client, group }) => ({
      message: `${client.name} moved to ${group.name}`,
      description: 'New orders use the new prices.',
    }),
  });
}

/** Invites a merchant: the server emails the sign-up link and creates the account as pending. Ports `m-invite`. */
export function useInviteClient() {
  return useApiMutation({
    mutationFn: (body: CreateClientBody) => createClient(body),
    invalidates: [{ resource: 'clients' }, { resource: 'client-groups' }],
    invalidateKeys: CLIENT_STALE_KEYS,
    successNotification: (_created, body) => ({
      message: 'Invitation sent',
      description: `${body.email} gets a sign-up link. The account stays pending until you approve it.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Changes how far below zero a merchant's wallet may go. */
export function useSetCreditLimit() {
  return useApiMutation({
    mutationFn: ({ client, creditLimit }: { client: Target; creditLimit: string }) =>
      setClientCreditLimit(client.id, { creditLimit }),
    invalidates: (_wallet, { client }) => staleClient(client.id),
    invalidateKeys: [WALLET_KEY, DASHBOARD_KEY],
    successNotification: (_wallet, { client, creditLimit }) => ({
      message: 'Credit limit updated',
      description: `${client.name} can now go ${money(creditLimit)} below zero.`,
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}
