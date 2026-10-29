// Refine notification provider: adapts Refine's open/close calls to the UI kit's toast store, so the toasts of Refine
// hooks and of our own `useApiMutation` look and behave the same.
import type { NotificationProvider, OpenNotificationParams } from '@refinedev/core';
import { dismiss, toast, type ToastInput } from '@/components/ui';

// Refine re-opens an undoable ("progress") notification every second with the same key to count down, so it must
// outlive that tick; once Refine stops, the toast goes away on its own.
const PROGRESS_TTL_MS = 2000;

/**
 * Turns Refine's notification into a toast: `success` and `error` keep their kind, `progress` (the undo countdown of
 * undoable mutations) becomes an info toast with an Undo button. The key becomes the toast id, so repeating a key
 * replaces the toast instead of stacking another one.
 */
export function toToastInput(params: OpenNotificationParams): ToastInput {
  const { key, message, description, type, cancelMutation } = params;
  const input: ToastInput = { id: key, title: message, body: description };
  if (type === 'progress') {
    return {
      ...input,
      kind: 'info',
      ttl: PROGRESS_TTL_MS,
      action: cancelMutation ? { label: 'Undo', run: cancelMutation } : undefined,
    };
  }
  return { ...input, kind: type };
}

export const notificationProvider: NotificationProvider = {
  open: (params) => {
    toast(toToastInput(params));
  },
  close: (key) => dismiss(key),
};
