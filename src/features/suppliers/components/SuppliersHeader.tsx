// SuppliersHeader: the page title with how many suppliers there are, how many are not healthy and how many are low on balance,
// and the Connect supplier button. Ports the `pageHead` of pageSuppliers in 44-p-suppliers.js.
import { Button, Icon, PageHeader } from '@/components/ui';
import { summarize } from '../lib/state';
import type { Supplier } from '../types';
import type { SupplierGrants } from '../hooks/useSupplierGrants';

export interface SuppliersHeaderProps {
  /** Undefined while the list loads: the title shows alone. */
  suppliers: readonly Supplier[] | undefined;
  grants: SupplierGrants;
  /** The empty state has its own Connect button, so the header leaves its own out (as the demo does). */
  hideConnect?: boolean;
  onConnect: () => void;
}

/** The title, the health counts and the Connect supplier button (disabled without `suppliers:create`). */
export function SuppliersHeader({ suppliers, grants, hideConnect = false, onConnect }: SuppliersHeaderProps) {
  const lock = grants.needs('suppliers:create');
  const counts = suppliers && suppliers.length > 0 ? summarize(suppliers) : null;
  return (
    <PageHeader
      title="Suppliers"
      sub={
        counts && (
          <>
            {counts.total} {counts.total === 1 ? 'supplier' : 'suppliers'}
            {counts.unhealthy > 0 ? (
              <>
                , <span className="font-medium text-serious-fg">{counts.unhealthy} not healthy</span>
              </>
            ) : (
              ', all healthy'
            )}
            {counts.low > 0 && (
              <>
                , <span className="font-medium text-warn-fg">{counts.low} low on prepaid balance</span>
              </>
            )}
          </>
        )
      }
      actions={
        hideConnect ? undefined : (
          <Button disabled={lock.disabled} title={lock.title} onClick={onConnect}>
            <Icon name="plus" className="ic-sm" />
            Connect supplier
          </Button>
        )
      }
    />
  );
}
