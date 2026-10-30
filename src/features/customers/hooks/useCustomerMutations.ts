// The actions on customers, each with the toast the demo showed and the reads it makes stale. The dialogs show a failed call
// themselves (in the error slot, or under the field the server named), so none of these toasts an error.
import { toast } from '@/components/ui';
import { useApiMutation, type InvalidateTarget } from '@/lib/query';
import {
  blockCustomer,
  createCustomer,
  createCustomerAccount,
  reactivateCustomer,
  revokeCustomerSessions,
  setCustomerPassword,
  suspendCustomer,
  updateCustomer,
} from '../api';
import type {
  CreateCustomerBody,
  Customer,
  CustomerPasswordBody,
  PasswordMode,
  UpdateCustomerBody,
} from '../types';
import { CUSTOMER_COUNTS_KEY } from './keys';

const NO_ERROR_TOAST = () => false as const;

// A change to one customer refreshes the lists and that customer's detail.
const staleCustomer = (id?: number): InvalidateTarget[] => [{ resource: 'customers', id }];

/** The part of a customer the toasts and requests need. */
type Who = Pick<Customer, 'id' | 'name' | 'email'>;

/** Adds a customer. The answer carries `temporaryPassword` once when that mode was chosen. */
export function useCreateCustomer() {
  return useApiMutation({
    mutationFn: (body: CreateCustomerBody) => createCustomer(body),
    // The answer may carry a one-time temporary password: drop it as soon as the dialog is gone.
    gcTime: 0,
    invalidates: staleCustomer(),
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    successNotification: (created, body) => ({
      message: `${created.name} added`,
      description:
        body.password.mode === 'reset_link'
          ? `An invitation to choose a password was sent to ${created.email}.`
          : 'Temporary password set. They must change it at first sign-in.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Saves the changed fields of a customer; the toast counts how many changed. */
export function useUpdateCustomer() {
  return useApiMutation({
    mutationFn: ({ customer, body }: { customer: Who; body: UpdateCustomerBody }) =>
      updateCustomer(customer.id, body),
    invalidates: (_updated, { customer }) => staleCustomer(customer.id),
    successNotification: (_updated, { body }) => {
      const count = Object.keys(body).length;
      return {
        message: 'Details saved',
        description: `${count} ${count === 1 ? 'field' : 'fields'} updated.`,
      };
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Creates an account for a guest: a link to choose a password, or a temporary password returned once. */
export function useCreateCustomerAccount() {
  return useApiMutation({
    mutationFn: ({ customer, mode }: { customer: Who; mode: PasswordMode }) =>
      createCustomerAccount(customer.id, { mode }),
    gcTime: 0,
    invalidates: (_result, { customer }) => staleCustomer(customer.id),
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    successNotification: (_result, { customer, mode }) => ({
      message: 'Account created',
      description:
        mode === 'reset_link'
          ? `An invitation was sent to ${customer.email}.`
          : 'Temporary password set. They must change it at first sign-in.',
    }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Sends a set-password link or sets a temporary password (returned once), optionally signing the customer out everywhere. */
export function useSetCustomerPassword() {
  return useApiMutation({
    mutationFn: ({ customer, body }: { customer: Who; body: CustomerPasswordBody }) =>
      setCustomerPassword(customer.id, body),
    gcTime: 0,
    invalidates: (_result, { customer }) => staleCustomer(customer.id),
    successNotification: (_result, { customer, body }) =>
      body.mode === 'reset_link'
        ? { message: 'Reset link sent', description: `Sent to ${customer.email}. It works for 1 hour.` }
        : {
            message: 'Temporary password set',
            description: `${customer.name} must change it at next sign-in.`,
          },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Signs a customer out of every device. */
export function useRevokeCustomerSessions() {
  return useApiMutation({
    mutationFn: (customer: Who) => revokeCustomerSessions(customer.id),
    invalidates: (_result, customer) => staleCustomer(customer.id),
    successNotification: () => ({ message: 'Signed out of all devices' }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Pauses an account with a reason and an optional note. The demo told this with a quiet "info" toast. */
export function useSuspendCustomer() {
  return useApiMutation({
    mutationFn: ({ customer, reason, note }: { customer: Who; reason: string; note?: string }) =>
      suspendCustomer(customer.id, note ? { reason, note } : { reason }),
    invalidates: (_result, { customer }) => staleCustomer(customer.id),
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    onSuccess: (_result, { customer }) => {
      toast({ kind: 'info', title: `${customer.name} suspended`, body: 'Signed out of all devices.' });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Lets a suspended customer sign in and order again. */
export function useReactivateCustomer() {
  return useApiMutation({
    mutationFn: (customer: Who) => reactivateCustomer(customer.id),
    invalidates: (_result, customer) => staleCustomer(customer.id),
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    successNotification: (_result, customer) => ({ message: `${customer.name} reactivated` }),
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Blocks a customer for fraud, with a reason. The demo told this with a quiet "info" toast. */
export function useBlockCustomer() {
  return useApiMutation({
    mutationFn: ({ customer, reason }: { customer: Who; reason: string }) =>
      blockCustomer(customer.id, { blocked: true, reason }),
    invalidates: (_result, { customer }) => staleCustomer(customer.id),
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    onSuccess: (_result, { customer }) => {
      toast({ kind: 'info', title: `${customer.name} blocked`, body: 'Added to the blocklist.' });
    },
    errorNotification: NO_ERROR_TOAST,
  });
}

/** Lifts a block. */
export function useUnblockCustomer() {
  return useApiMutation({
    mutationFn: (customer: Who) => blockCustomer(customer.id, { blocked: false }),
    invalidates: (_result, customer) => staleCustomer(customer.id),
    invalidateKeys: [CUSTOMER_COUNTS_KEY],
    successNotification: (_result, customer) => ({ message: `${customer.name} unblocked` }),
    errorNotification: NO_ERROR_TOAST,
  });
}
