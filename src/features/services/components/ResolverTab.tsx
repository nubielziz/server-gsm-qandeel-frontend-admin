// ResolverTab: the "Price resolver" tab: pick a merchant and a service and see the price the merchant pays, with the steps that led to
// it. Ports `resolverTab` of 43-p-services.js. The demo resolved in the browser (`resolveWith`); the server resolves here
// (`GET /admin/pricing/resolve`) and nothing is worked out in the browser. The choice lives in the address, so "Trace a merchant
// price" on a service row can link straight here.
import { EmptyState, ErrorState, QueryState, SkeletonTable } from '@/components/ui';
import { useMerchantOptions, useServiceChoices } from '../hooks/useChoices';
import { useResolution } from '../hooks/useResolution';
import { useResolverView } from '../hooks/useSelectionView';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { ResolverControls } from './ResolverControls';
import { ResolverSummary } from './ResolverSummary';
import { TraceSteps } from './TraceSteps';

/** Menus, then the server's resolution for the chosen merchant and service. */
export function ResolverTab() {
  const grants = useServiceGrants();
  const view = useResolverView();
  const canMerchants = grants.can('clients:read');
  const services = useServiceChoices(grants.ready);
  const merchants = useMerchantOptions(grants.ready && canMerchants);

  // The demo listed merchants that are not waiting for approval; an unset choice falls back to the first of each list.
  const merchantList = (merchants.data ?? []).filter((merchant) => merchant.status !== 'pending');
  const serviceList = services.data ?? [];
  const serviceId = view.serviceId ?? serviceList[0]?.id ?? null;
  const clientId = view.clientId ?? merchantList[0]?.id ?? null;
  const merchant = merchantList.find((candidate) => candidate.id === clientId);
  const resolution = useResolution(serviceId, clientId);

  if (grants.ready && !canMerchants) {
    return (
      <EmptyState icon="lock" title="Choose a merchant">
        You need the clients:read permission to pick the merchant whose price you want to trace.
      </EmptyState>
    );
  }
  const listError = services.isError ? services : merchants.isError ? merchants : undefined;
  const listsLoading = !grants.ready || services.isLoading || merchants.isLoading;
  const noChoices = merchantList.length === 0 || serviceList.length === 0;

  return (
    <QueryState
      isLoading={listsLoading}
      isError={Boolean(listError)}
      error={listError?.error}
      onRetry={() => {
        void services.refetch();
        void merchants.refetch();
      }}
      errorTitle="Could not load the merchants and services"
      isEmpty={noChoices}
      empty={
        <EmptyState icon="scale" title="Nothing to resolve yet">
          Add a merchant and a service to see how a price is built.
        </EmptyState>
      }
      skeleton={<SkeletonTable cols={2} rows={5} />}
    >
      <ResolverControls
        merchants={merchantList}
        services={serviceList}
        merchantId={clientId}
        serviceId={serviceId}
        onMerchant={view.setClientId}
        onService={view.setServiceId}
      />
      {resolution.isLoading ? (
        <SkeletonTable cols={2} rows={6} />
      ) : resolution.isError ? (
        <ErrorState
          title="Could not resolve the price"
          error={resolution.error}
          onRetry={() => void resolution.refetch()}
        />
      ) : (
        resolution.data && (
          <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <TraceSteps resolution={resolution.data} />
            <ResolverSummary
              resolution={resolution.data}
              merchantName={merchant?.name ?? `Merchant ${clientId}`}
              groupId={merchant?.group?.id}
            />
          </div>
        )
      )}
    </QueryState>
  );
}
