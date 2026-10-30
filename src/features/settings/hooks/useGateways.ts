// The payment gateways: the list for the Payment methods tab, the merchant group names the cards show, and the changes (create, edit,
// the on/off switch, delete). A failed switch shows the server's message as a toast; the dialogs show their own failures.
import { useList } from '@refinedev/core';
import { listClientGroups } from '@/features/merchants';
import { useApiMutation, useApiQuery } from '@/lib/query';
import { createGateway, deleteGateway, updateGateway } from '../api';
import type { CreateGatewayBody, PaymentGateway, UpdateGatewayBody } from '../types';
import { GROUP_NAMES_KEY, LOOKUP_STALE_MS, WHOLE_LIST } from './keys';

const NO_ERROR_TOAST = () => false as const;

/** Every gateway, loaded whole (there are few). Needs `payments:gateways`. */
export function useGatewayList(enabled = true) {
  const { result, query } = useList<PaymentGateway>({
    resource: 'payment-gateways',
    pagination: { currentPage: 1, pageSize: WHOLE_LIST },
    sorters: [{ field: 'name', order: 'asc' }],
    queryOptions: { enabled },
    // The tab shows its own error state with Retry, so Refine's default error toast would only repeat it.
    errorNotification: false,
  });
  return { gateways: result.data, query };
}

/** The merchant groups by name, for "Merchant groups" on a card and in the dialog. Pass `enabled: false` without `groups:read`. */
export function useGroupNames(enabled = true) {
  return useApiQuery({
    queryKey: [...GROUP_NAMES_KEY],
    queryFn: ({ signal }) =>
      listClientGroups({ start: 0, end: WHOLE_LIST, sort: ['sort'], order: ['asc'] }, { signal }),
    select: (result) => result.data,
    enabled,
    staleTime: LOOKUP_STALE_MS,
  });
}

/** Connects a gateway. The dialog shows a failure. */
export function useCreateGateway() {
  return useApiMutation({
    mutationFn: (body: CreateGatewayBody) => createGateway(body),
    // The body may carry the gateway's secret: drop it from the cache as soon as the dialog is done.
    gcTime: 0,
    invalidates: [{ resource: 'payment-gateways' }],
    successNotification: (gateway) => ({ message: `${gateway.name} added` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a gateway. The dialog shows a failure. */
export function useUpdateGateway() {
  return useApiMutation({
    // Same rule: an edit may carry a new secret.
    gcTime: 0,
    mutationFn: ({ gateway, body }: { gateway: PaymentGateway; body: UpdateGatewayBody }) =>
      updateGateway(gateway.id, body),
    invalidates: (_result, { gateway }) => [{ resource: 'payment-gateways', id: gateway.id }],
    successNotification: (gateway) => ({ message: `${gateway.name} saved` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** The on/off switch of a card (`st-gw` in the demo). A refusal shows as the default error toast with the server's words. */
export function useToggleGateway() {
  return useApiMutation({
    mutationFn: ({ gateway, on }: { gateway: PaymentGateway; on: boolean }) =>
      updateGateway(gateway.id, { isActive: on }),
    invalidates: (_result, { gateway }) => [{ resource: 'payment-gateways', id: gateway.id }],
    successNotification: (gateway, { on }) => ({
      message: `${gateway.name} is ${on ? 'on' : 'off'}`,
      description: on ? 'Customers can pay with it at checkout.' : 'It no longer shows at checkout.',
    }),
  });
}

/** Deletes a gateway. The server refuses one that took payments lately. */
export function useDeleteGateway() {
  return useApiMutation({
    mutationFn: (gateway: PaymentGateway) => deleteGateway(gateway.id),
    invalidates: (_result, gateway) => [{ resource: 'payment-gateways', id: gateway.id }],
    successNotification: (_result, gateway) => ({ message: `${gateway.name} deleted` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
