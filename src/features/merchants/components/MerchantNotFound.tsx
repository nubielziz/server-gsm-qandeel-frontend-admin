// MerchantNotFound: what a merchant's page says for an address with no merchant behind it. Ports the not-found branch of
// pageMerchant in 42-p-merchants.js.
import { ButtonLink, EmptyState, PageHeader, Panel } from '@/components/ui';

/** Shown when the address names no merchant. */
export function MerchantNotFound() {
  return (
    <>
      <PageHeader title="Merchant not found" />
      <Panel flush>
        <EmptyState
          icon="users"
          title="No merchant with that ID"
          cta={<ButtonLink to="/merchants">Back to merchants</ButtonLink>}
        >
          It may have been removed.
        </EmptyState>
      </Panel>
    </>
  );
}
