// CustomerNotFound: what the detail page says for an id that no customer has. Ports the not-found branch of pageCustomer in
// 48-p-customers.js.
import { ButtonLink, EmptyState, PageHeader, Panel } from '@/components/ui';

export function CustomerNotFound() {
  return (
    <>
      <PageHeader title="Customer not found" />
      <Panel flush>
        <EmptyState
          icon="user"
          title="No customer with that ID"
          cta={<ButtonLink to="/customers">Back to customers</ButtonLink>}
        >
          It may have been removed.
        </EmptyState>
      </Panel>
    </>
  );
}
