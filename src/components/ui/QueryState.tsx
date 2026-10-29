// QueryState: one place for the four states of a data view (loading, error, empty, success), see ARCHITECTURE §4.
import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { SkeletonTable } from './SkeletonTable';

export interface QueryStateProps {
  isLoading?: boolean;
  isError?: boolean;
  /** Any thrown value; ErrorState reads its title, detail and requestId. */
  error?: unknown;
  /** True when the request worked but returned nothing. */
  isEmpty?: boolean;
  onRetry?: () => void;
  /** Title for the failure state, for example "Could not load orders". */
  errorTitle?: string;
  /** Loading placeholder in the shape of the content. Default: a table skeleton. */
  skeleton?: ReactNode;
  /** Empty block. Default: a generic "Nothing to show". */
  empty?: ReactNode;
  children?: ReactNode;
}

/** Order matters: a failed request shows the error even if stale data is empty, and loading wins over both. */
export function QueryState({
  isLoading = false,
  isError = false,
  error,
  isEmpty = false,
  onRetry,
  errorTitle,
  skeleton,
  empty,
  children,
}: QueryStateProps) {
  if (isLoading) return <>{skeleton ?? <SkeletonTable />}</>;
  if (isError) return <ErrorState title={errorTitle} error={error} onRetry={onRetry} />;
  if (isEmpty) return <>{empty ?? <EmptyState title="Nothing to show">No rows match.</EmptyState>}</>;
  return <>{children}</>;
}
