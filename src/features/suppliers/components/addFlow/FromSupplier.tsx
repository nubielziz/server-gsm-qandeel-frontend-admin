// The first choice of step 1 of the Add services flow: pick a connected supplier, then "Whole groups" or "Single services". It shows the
// list's own states (loading, error, none, locked without suppliers:read) and keeps every control behind its permission hint.
import { useId } from 'react';
import { Button, ButtonLink, EmptyState, ErrorState, Icon, Skeleton } from '@/components/ui';
import type { Id } from '@/lib/api';
import type { SupplierGrants } from '../../hooks/useSupplierGrants';
import type { useSuppliers } from '../../hooks/useSuppliers';
import type { Supplier } from '../../types';
import { CATALOG_CREATE, SUPPLIERS_READ, WAYS, firstLock, type AddFlowFrom } from './addFlowChoice';
import { SupplierChoiceList } from './SupplierChoiceList';

/** What the suppliers hook gives: the rows and the query that read them. */
export type SuppliersList = ReturnType<typeof useSuppliers>;

/** What the first choice needs: the grants and the supplier list, what is marked, and the two things the staff member can do. */
export interface FromSupplierProps {
  grants: SupplierGrants;
  list: SuppliersList;
  /** The supplier that is marked and can be chosen. */
  marked: Supplier | undefined;
  /** A line about the supplier the opening address named, when it cannot start the flow. */
  notice: string | undefined;
  onMark: (id: Id) => void;
  onPick: (from: AddFlowFrom) => void;
}

/** The three bars of a list that is still loading (also shown while the staff member's permissions load). */
export function ListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <Skeleton height={44} />
      <Skeleton height={44} />
      <Skeleton height={44} />
    </div>
  );
}

/** The list part: whichever of locked, loading, error, none or the radios applies. */
function Suppliers({ grants, list, marked, onMark }: Omit<FromSupplierProps, 'notice' | 'onPick'>) {
  const read = grants.needs(SUPPLIERS_READ);
  const { query, suppliers } = list;
  if (read.disabled) {
    return (
      <p className="flex items-center gap-2 rounded-md bg-sunken px-3 py-2.5 text-sm text-ink2">
        <Icon name="lock" className="ic-sm flex-none" />
        {read.title} to pick a supplier.
      </p>
    );
  }
  if (query.isLoading) return <ListSkeleton />;
  if (query.isError && suppliers.length === 0) {
    return (
      <ErrorState
        title="Could not load the suppliers"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (suppliers.length === 0) {
    return (
      <EmptyState
        icon="server"
        title="No suppliers connected"
        cta={<ButtonLink to="/suppliers">Open Suppliers</ButtonLink>}
      >
        Connect a supplier on the Suppliers page, then come back to add its services.
      </EmptyState>
    );
  }
  return <SupplierChoiceList suppliers={suppliers} markedId={marked?.id ?? null} onMark={onMark} />;
}

/** The first choice: the suppliers, then the two ways in. The ways are hidden while there is nothing to choose from. Mount it once `grants.ready`. */
export function FromSupplier(props: FromSupplierProps) {
  const { grants, list, marked, notice, onPick } = props;
  const headingId = useId();
  const lock = firstLock(grants.needs(SUPPLIERS_READ), grants.needs(CATALOG_CREATE));
  const failed = list.query.isError && list.suppliers.length === 0;
  const none = list.query.isSuccess && list.suppliers.length === 0;
  const choosing = !failed && !none;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h3 id={headingId} className="text-base font-semibold">
          From a supplier
        </h3>
        <p className="text-sm text-ink2">
          Pick one of your connected suppliers, then how to add its services.
        </p>
      </div>
      {notice && (
        <p role="status" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          {notice}
        </p>
      )}
      <Suppliers {...props} />
      {choosing && (
        <div className="grid gap-3 sm:grid-cols-2">
          {WAYS.map((way) => (
            <div key={way.id}>
              <Button
                disabled={lock.disabled || !marked}
                title={lock.title ?? (marked ? undefined : 'Pick a supplier first')}
                aria-describedby={`${headingId}-${way.id}`}
                onClick={() => onPick(way.id)}
              >
                {way.label}
              </Button>
              <p id={`${headingId}-${way.id}`} className="mt-1 text-xs text-ink3">
                {way.hint}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
