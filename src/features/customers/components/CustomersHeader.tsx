// CustomersHeader: the page title with the sentence about how many storefront customers there are, and the Add customer button. Ports
// the `head` of pageCustomers in 48-p-customers.js, without its Export CSV button (MISMATCHES M83) and with the count's words of M259.
import { Button, Icon, PageHeader } from '@/components/ui';
import { num } from '@/lib/format';
import type { CustomerGrants } from '../hooks/useCustomerGrants';

export interface CustomersHeaderProps {
  grants: CustomerGrants;
  /** Every storefront customer (a guest exists from their first checkout, paid or not), from the All tab's count; undefined until it has loaded. */
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
          ? `${num(total)} ${total === 1 ? 'customer' : 'customers'} on the storefront. ${num(withAccount)} ${withAccount === 1 ? 'has' : 'have'} an account, the rest are guests.`
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
