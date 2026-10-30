// CustomersHeader: the page title with the sentence about how many people bought, and the Add customer button. Ports the `head`
// of pageCustomers in 48-p-customers.js, without its Export CSV button (MISMATCHES M83).
import { Button, Icon, PageHeader } from '@/components/ui';
import { num } from '@/lib/format';
import type { CustomerGrants } from '../hooks/useCustomerGrants';

export interface CustomersHeaderProps {
  grants: CustomerGrants;
  /** Everyone who has bought, from the All tab's count; undefined until it has loaded. */
  total: number | undefined;
  /** How many of them have an account. */
  withAccount: number | undefined;
  onAdd: () => void;
}

export function CustomersHeader({ grants, total, withAccount, onAdd }: CustomersHeaderProps) {
  const lock = grants.needs('customers:create');
  const known = total !== undefined && withAccount !== undefined;
  return (
    <PageHeader
      title="Customers"
      sub={
        known
          ? `${num(total)} ${total === 1 ? 'person has' : 'people have'} bought on the storefront. ${num(withAccount)} have an account, the rest checked out as guests.`
          : undefined
      }
      actions={
        <Button variant="primary" disabled={lock.disabled} title={lock.title} onClick={onAdd}>
          <Icon name="plus" className="ic-sm" />
          Add customer
        </Button>
      }
    />
  );
}
