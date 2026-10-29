// React Query mutation wrapper for action endpoints (suspend, approve, apply…). It adds what every action
// needs: Refine cache invalidation, a success toast chosen by the caller, and a default error toast.
import { useInvalidate, useNotification, useOnError } from '@refinedev/core';
import { useMutation, useQueryClient, type QueryKey, type UseMutationResult } from '@tanstack/react-query';
import type { ApiError, Id } from '@/lib/api';
import { errorToast, type Toast } from './toast';

/** One Refine resource whose cached lists or records are stale after the mutation. */
export type InvalidateTarget = {
  resource: string;
  id?: Id;
  /** Which cached queries to refresh; defaults to lists, many-by-id lookups and details. */
  invalidates?: ('list' | 'detail' | 'many' | 'all')[];
};

export type UseApiMutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Refine resources to refresh on success; a function can use the result or the variables (for the id). */
  invalidates?: InvalidateTarget[] | ((data: TData, variables: TVariables) => InvalidateTarget[]);
  /** Extra React Query keys to refresh, for `['api', feature, ...]` reads. */
  invalidateKeys?: QueryKey[];
  /** Success toast; return false (or omit) for none. */
  successNotification?: (data: TData, variables: TVariables) => Toast | false;
  /** Error toast; the default shows the server's title and detail. Return false when the form shows the error. */
  errorNotification?: (error: ApiError, variables: TVariables) => Toast | false;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: ApiError, variables: TVariables) => void;
  /** How long the last result stays cached after the component unmounts; 0 for one-time secrets (passwords). */
  gcTime?: number;
};

/** `useMutation` for one endpoint call: toasts, invalidation and sign-out handling in one place. */
export function useApiMutation<TData = void, TVariables = void>(
  options: UseApiMutationOptions<TData, TVariables>,
): UseMutationResult<TData, ApiError, TVariables> {
  const { open } = useNotification();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const { mutate: checkError } = useOnError();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: options.mutationFn,
    gcTime: options.gcTime,
    onSuccess: async (data, variables) => {
      const toast = options.successNotification?.(data, variables);
      if (toast) open?.({ type: 'success', ...toast });

      const targets =
        typeof options.invalidates === 'function'
          ? options.invalidates(data, variables)
          : (options.invalidates ?? []);
      await Promise.all([
        ...targets.map((t) =>
          invalidate({
            resource: t.resource,
            id: t.id,
            invalidates: t.invalidates ?? ['list', 'many', 'detail'],
          }),
        ),
        ...(options.invalidateKeys ?? []).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ]);
      await options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      checkError(error);
      // A 401 signs the user out and redirects, so a toast on top of that would only add noise.
      const toast = options.errorNotification
        ? options.errorNotification(error, variables)
        : error.status === 401
          ? false
          : errorToast(error);
      if (toast) open?.({ type: 'error', ...toast });
      options.onError?.(error, variables);
    },
  });
}
