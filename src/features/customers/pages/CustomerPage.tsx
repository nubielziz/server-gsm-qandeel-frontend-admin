// CustomerPage: one customer (`/customers/:id`, the demo's `pageCustomer` in 48-p-customers.js). It reads the customer and
// shows the not-found state for an unknown id, a loading skeleton, an error with Retry, or the customer. The breadcrumb and the
// tab title carry the customer's name. The page only composes; `CustomerView` draws the customer.
import { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router';
import { ErrorState, PageHeader, Panel, SkeletonStat, SkeletonTable } from '@/components/ui';
import { useBreadcrumbTitle } from '@/app/layout/breadcrumbTitle';
import { CustomerNotFound } from '../components/CustomerNotFound';
import { useCustomer } from '../hooks/useCustomer';

// The customer view brings the orders table and drawer, every dialog and the access feature's dialogs. It loads on its own,
// started as soon as the page opens, so the list page does not carry that code and the view arrives while the customer is read.
const loadView = () => import('../components/CustomerView');
const CustomerView = lazy(() => loadView().then((module) => ({ default: module.CustomerView })));

/** The skeleton of the page: the figures and a table while the customer or the view loads. */
function CustomerLoading() {
  return (
    <>
      <PageHeader title="Customer" />
      <SkeletonStat cells={5} />
      <Panel flush>
        <SkeletonTable cols={5} rows={6} />
      </Panel>
    </>
  );
}

export function CustomerPage() {
  const params = useParams();
  const id = params.id && /^\d+$/.test(params.id) ? Number(params.id) : undefined;
  const { customer, notFound, query } = useCustomer(id);
  useBreadcrumbTitle(customer?.name);
  useEffect(() => {
    void loadView();
  }, []);

  if (id === undefined || notFound) return <CustomerNotFound />;
  if (customer) {
    return (
      <Suspense fallback={<CustomerLoading />}>
        <CustomerView customer={customer} />
      </Suspense>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title="Customer" />
        <Panel flush>
          <ErrorState
            title="Could not load the customer"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </Panel>
      </>
    );
  }
  return <CustomerLoading />;
}
