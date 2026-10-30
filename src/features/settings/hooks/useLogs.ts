// The two logs as Refine lists with a detail read: the sent notifications and the merchant webhook deliveries, newest first, a page at a
// time. The row opens in a drawer; the single-record read (`GET /:id`) adds the payload and the merchant's answer.
import { useList, useOne, type CrudFilters } from '@refinedev/core';
import { useApiMutation } from '@/lib/query';
import { retryWebhookDelivery } from '../api';
import type { NotificationLogEntry, WebhookDelivery, WebhookDeliveryDetail } from '../types';
import { LOG_PAGE_SIZE } from './keys';

/** The filters of a log as Refine filters; an empty text means "no filter", and `q` is the free-text search. */
function crudFilters(filters: Record<string, string>): CrudFilters {
  const out: CrudFilters = [];
  for (const [field, value] of Object.entries(filters)) {
    if (value.trim()) out.push({ field, operator: 'eq', value: value.trim() });
  }
  return out;
}

export type LogListArgs = { filters: Record<string, string>; page: number; enabled?: boolean };

/** One page of the notification log. `total` is what the server counted for the whole filter. Needs `notifications:read`. */
export function useNotificationList({ filters, page, enabled = true }: LogListArgs) {
  const { result, query } = useList<NotificationLogEntry>({
    resource: 'notifications',
    pagination: { currentPage: page, pageSize: LOG_PAGE_SIZE },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    filters: crudFilters(filters),
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { rows: result.data, total: result.total, query };
}

/** One page of the webhook log. Needs `webhooks:read`. */
export function useDeliveryList({ filters, page, enabled = true }: LogListArgs) {
  const { result, query } = useList<WebhookDelivery>({
    resource: 'webhook-deliveries',
    pagination: { currentPage: page, pageSize: LOG_PAGE_SIZE },
    sorters: [{ field: 'createdAt', order: 'desc' }],
    filters: crudFilters(filters),
    queryOptions: { enabled },
    errorNotification: false,
  });
  return { rows: result.data, total: result.total, query };
}

/** One notification for the drawer. The list row shows at once; the single read adds the payload and the failure reason. */
export function useNotification(id: number, row?: NotificationLogEntry) {
  const { result, query } = useOne<NotificationLogEntry>({
    resource: 'notifications',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    errorNotification: false,
  });
  return { notification: result ?? row, query };
}

/** One delivery for the drawer, with the request and the merchant's answer. */
export function useDelivery(id: number, row?: WebhookDelivery) {
  const { result, query } = useOne<WebhookDeliveryDetail>({
    resource: 'webhook-deliveries',
    id,
    queryOptions: { placeholderData: row ? { data: row } : undefined },
    errorNotification: false,
  });
  const delivery: WebhookDeliveryDetail | undefined = result ?? row;
  return { delivery, query };
}

/** Retry: asks the server to send the delivery again. The drawer shows a refusal; a success is a toast. */
export function useRetryDelivery() {
  return useApiMutation({
    mutationFn: (delivery: WebhookDelivery) => retryWebhookDelivery(delivery.id),
    invalidates: (_result, delivery) => [{ resource: 'webhook-deliveries', id: delivery.id }],
    successNotification: () => ({
      message: 'Sending again',
      description: 'The server queued a new attempt. The result shows here when the merchant answers.',
    }),
    errorNotification: () => false,
  });
}
