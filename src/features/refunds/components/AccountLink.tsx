// AccountLink: the name of the account behind a refund, a dispute or a payment, linked to its record (the key on the wire keeps the word
// `customer`, now an account number). A person who cannot open the Accounts page sees the name as text, because the link would only
// lead to a no-access page.
import { Link } from 'react-router';
import { accountPath } from '@/features/accounts';
import type { NamedRef } from '@/features/orders';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import { accountLabel } from '@/lib/format';

export function AccountLink({ account }: { account: NamedRef | null }) {
  const canOpen = useCanOpenPage('accounts');
  const label = accountLabel(account);
  if (!account) return <span className="text-ink3">Unknown</span>;
  if (canOpen === false) return <span>{label}</span>;
  return (
    <Link className="link" to={accountPath(account.id)}>
      {label}
    </Link>
  );
}
