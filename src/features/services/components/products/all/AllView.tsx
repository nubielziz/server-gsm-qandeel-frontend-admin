// AllView: the "All" view of the Product / Services page: the services of the kind on the strip, in the reference's layout. A "Quick Search" box
// (group, text, API, quick filter), one refresh tool, a dense table (checkbox, Service Name with its number and code, API, Group, a Status
// square, a Shop square, the edit link), the "With selected" strip under it and the pinned footer with the page and the page size.
// Every filter, the page and the page size live in the address; every figure and word is the server's. It reads the services with
// catalog:read (the registry's gate); each control keeps its own permission lock.
import { useMemo } from 'react';
import { DataTable, FooterPager, RefreshTool, usePageClamp, useRowSelection } from '@/components/ui';
import { useCategories, useSupplierChoices } from '../../../hooks/useChoices';
import { usePutOnShop } from '../../../hooks/usePutOnShop';
import type { ProductsViewProps } from '../types';
import { AllEmpty } from './AllEmpty';
import { hasFilters, type AllAddress } from './allAddress';
import { BulkStrip } from './BulkStrip';
import { QuickSearch } from './QuickSearch';
import { serviceColumns } from './serviceColumns';
import { useAllAddress } from './useAllAddress';
import { useAllList } from './useAllList';
import { useStatusSwitch } from './useStatusSwitch';

/** The list of the services of one kind. */
export function AllView({ type, grants }: ProductsViewProps) {
  const storefront = grants.can('storefront:read');
  const { address, change } = useAllAddress(type);
  const { rows, total, settled, query } = useAllList(type, address, { storefront });
  const { categories } = useCategories();
  const suppliers = useSupplierChoices(grants.can('suppliers:read'));
  const selection = useRowSelection<number>();
  const statusSwitch = useStatusSwitch();
  const shopSwitch = usePutOnShop();

  // The groups a service of this kind can be in: the same kind only.
  const groups = useMemo(() => categories.filter((category) => category.type === type), [categories, type]);

  // A change of the list leaves the ticks behind: they were about other rows.
  const { clear } = selection;
  const go = (patch: Partial<AllAddress>) => {
    clear();
    change(patch);
  };
  usePageClamp({
    page: address.page,
    pageSize: address.size,
    total,
    settled,
    setPage: (page) => go({ page }),
  });

  const columns = serviceColumns({ type, grants, shop: storefront, status: statusSwitch, shopSwitch });

  return (
    <div className="view-frame">
      <div>
        <QuickSearch
          address={address}
          groups={groups}
          suppliers={suppliers.data ?? []}
          supplierLock={grants.needs('suppliers:read')}
          storefront={storefront}
          onApply={go}
        />
        <RefreshTool onRefresh={() => void query.refetch()} busy={query.isFetching} />
        <DataTable
          skin="list"
          footer={false}
          caption="Services"
          columns={columns}
          rows={rows}
          rowKey={(service) => service.id}
          selection={selection}
          state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
          error={query.error}
          errorTitle="Could not load the services"
          onRetry={() => void query.refetch()}
          empty={
            <AllEmpty type={type} filtered={hasFilters(address)} canAdd={grants.can('catalog:create')} />
          }
        />
        {rows.length > 0 && (
          <BulkStrip
            type={type}
            rows={rows}
            selection={selection}
            grants={grants}
            shop={storefront}
            groups={groups}
          />
        )}
      </div>
      <FooterPager
        page={address.page}
        pageSize={address.size}
        total={total ?? 0}
        onPage={(page) => go({ page })}
        onPageSize={(size) => go({ size })}
      />
    </div>
  );
}
