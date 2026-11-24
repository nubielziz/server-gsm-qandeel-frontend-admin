// ReadGate: what a section of the Privacy and risk part shows while its read is loading or has failed: a few grey bars, or a line with
// Retry. The rest of the record stays as it is; only this section waits.
import type { ReactNode } from 'react';
import { Button, Skeleton } from '@/components/ui';

/** What the gate needs of a query: the state it is in and a way to read again. */
export type GateQuery<T> = {
  isLoading: boolean;
  isError: boolean;
  data: T | undefined;
  refetch: () => unknown;
};

export interface ReadGateProps<T> {
  query: GateQuery<T>;
  /** What the section is called, for the words of the failure ("Could not load the privacy details."). */
  what: string;
  /** A second section on the same read: it shows nothing on a failure, because the first one already says so. */
  quiet?: boolean;
  children: (data: T) => ReactNode;
}

/** Draws the section's rows once the data is here. */
export function ReadGate<T>({ query, what, quiet = false, children }: ReadGateProps<T>) {
  if (query.isLoading) {
    return (
      <div role="status" aria-label={`Loading the ${what}`} className="space-y-2 py-2">
        <Skeleton width="45%" />
        <Skeleton width="70%" />
        <Skeleton width="55%" />
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    if (quiet) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 py-2 text-sm text-crit-fg" role="alert">
        <span>Could not load the {what}.</span>
        <Button size="sm" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}
