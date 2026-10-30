// LoadGate: what a dialog shows while the data it starts from is loading or failed (a service's detail, the merchant groups).
// A dialog that edits a whole list must not open on empty data: saving would replace the real list with nothing. Once `ready`
// it renders its children (the form); until then it is an info-only dialog with the loading or error state and a Close button.
import type { ReactNode } from 'react';
import { Button, Modal, QueryState, SkeletonTable } from '@/components/ui';

/** The part of a query result the gate reads. */
export type GateQuery = { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };

export interface LoadGateProps {
  ready: boolean;
  queries: readonly GateQuery[];
  title: string;
  sub?: ReactNode;
  errorTitle: string;
  onClose: () => void;
  children: ReactNode;
}

/** Shows the children once `ready`; until then a dialog with the loading or error state. */
export function LoadGate({ ready, queries, title, sub, errorTitle, onClose, children }: LoadGateProps) {
  if (ready) return <>{children}</>;
  const failed = queries.find((query) => query.isError);
  return (
    <Modal open title={title} sub={sub} onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <QueryState
        isLoading={!failed}
        isError={Boolean(failed)}
        error={failed?.error}
        onRetry={() => queries.forEach((query) => void query.refetch())}
        errorTitle={errorTitle}
        skeleton={<SkeletonTable cols={2} rows={3} />}
      />
    </Modal>
  );
}
