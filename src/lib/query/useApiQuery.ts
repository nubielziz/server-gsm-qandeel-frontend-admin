// React Query wrapper for the reads Refine's data hooks do not cover (reports, previews, health).
// It shares Refine's QueryClient (decision 005) and reports API errors to the auth provider like Refine's hooks do.
import { useOnError } from '@refinedev/core';
import {
  useQuery,
  type QueryFunction,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { isApiError, type ApiError } from '@/lib/api';

/** Keys of non-CRUD reads start with `['api', <feature>, ...]`, so they never collide with Refine's own keys. */
export type ApiQueryKey = readonly ['api', string, ...unknown[]];

export type UseApiQueryOptions<TData, TSelected = TData> = Omit<
  UseQueryOptions<TData, ApiError, TSelected, ApiQueryKey>,
  'queryKey' | 'queryFn'
> & {
  queryKey: ApiQueryKey;
  /** Receives React Query's context; pass `signal` on to the API function so a leaving page cancels the call. */
  queryFn: QueryFunction<TData, ApiQueryKey>;
};

/** Retry policy: never on 4xx (the answer will not change), once on a network failure or a 5xx. */
export function shouldRetryApiQuery(failureCount: number, error: unknown): boolean {
  return isApiError(error) && (error.status === 0 || error.status >= 500) && failureCount < 1;
}

/** `useQuery` with the project's retry policy and sign-out handling (401, suspended, IP blocked). */
export function useApiQuery<TData, TSelected = TData>(
  options: UseApiQueryOptions<TData, TSelected>,
): UseQueryResult<TSelected, ApiError> {
  const { mutate: checkError } = useOnError();
  const query = useQuery<TData, ApiError, TSelected, ApiQueryKey>({ retry: shouldRetryApiQuery, ...options });
  const error = query.error;
  useEffect(() => {
    if (error) checkError(error);
  }, [error, checkError]);
  return query;
}
