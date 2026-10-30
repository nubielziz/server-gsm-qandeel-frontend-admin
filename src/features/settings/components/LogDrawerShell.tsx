// LogDrawerShell: the drawer frame both log drawers share: a loading skeleton, the error state with Retry, or the content once the record is
// known. A deep link (`?notification=<id>`) has no list row, so the first paint is the skeleton.
import type { ReactNode } from 'react';
import { Drawer, ErrorState, SkeletonTable } from '@/components/ui';

export interface LogDrawerShellProps {
  title: string;
  /** Whether the record is known yet (from the list row or the single read). */
  ready: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onClose: () => void;
  badges?: ReactNode;
  sub?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** A drawer that shows its content when `ready`. */
export function LogDrawerShell({
  title,
  ready,
  isError,
  error,
  onRetry,
  onClose,
  badges,
  sub,
  footer,
  children,
}: LogDrawerShellProps) {
  return (
    <Drawer
      open
      onClose={onClose}
      title={title}
      badges={ready ? badges : undefined}
      sub={ready ? sub : undefined}
      footer={footer ?? <span className="flex-1" />}
    >
      {ready ? (
        children
      ) : isError ? (
        <ErrorState title="Could not load this record" error={error} onRetry={onRetry} />
      ) : (
        <SkeletonTable cols={2} rows={6} />
      )}
    </Drawer>
  );
}
