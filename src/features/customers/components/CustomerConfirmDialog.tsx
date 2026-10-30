// CustomerConfirmDialog: the review step before five actions that need no input: "Sign <name> out everywhere?" (`cu-signout`),
// "Reactivate <name>?" (`cu-reactivate`), "Unblock <name>?" (`cu-unblock`), "Export <name>'s data?" (new, the demo exported on one
// click) and "Anonymise <name>?" (`cu-anon`). A failed call shows in the dialog.
import { ConfirmDialog } from '@/components/ui';
import {
  useReactivateCustomer,
  useRevokeCustomerSessions,
  useUnblockCustomer,
} from '../hooks/useCustomerMutations';
import { useAnonymizeCustomer, useExportCustomerData } from '../hooks/usePrivacyMutations';
import { devicesText } from '../lib/text';
import type { CustomerDetail } from '../types';

export interface CustomerConfirmDialogProps {
  kind: 'signout' | 'reactivate' | 'unblock' | 'export' | 'anonymize';
  customer: CustomerDetail;
  onClose: () => void;
}

/** One review dialog for the five actions: each asks for a click and says what will happen. */
export function CustomerConfirmDialog({ kind, customer, onClose }: CustomerConfirmDialogProps) {
  const signOut = useRevokeCustomerSessions();
  const reactivate = useReactivateCustomer();
  const unblock = useUnblockCustomer();
  const exporter = useExportCustomerData();
  const anonymize = useAnonymizeCustomer();

  if (kind === 'signout') {
    const devices = customer.account?.activeSessions ?? 0;
    return (
      <ConfirmDialog
        open
        title={`Sign ${customer.name} out everywhere?`}
        body={
          <p>They are signed out of {devicesText(devices)}. They can sign in again with their password.</p>
        }
        confirm="Sign out"
        onClose={onClose}
        onConfirm={() => signOut.mutateAsync(customer).then(() => undefined)}
      />
    );
  }
  if (kind === 'reactivate') {
    return (
      <ConfirmDialog
        open
        title={`Reactivate ${customer.name}?`}
        body={<p>They can sign in and order again. They will need to sign in again on their devices.</p>}
        confirm="Reactivate"
        onClose={onClose}
        onConfirm={() => reactivate.mutateAsync(customer).then(() => undefined)}
      />
    );
  }
  if (kind === 'unblock') {
    return (
      <ConfirmDialog
        open
        title={`Unblock ${customer.name}?`}
        body={<p>They can order again. Their email stays on the blocklist until you remove it there.</p>}
        confirm="Unblock"
        onClose={onClose}
        onConfirm={() => unblock.mutateAsync(customer).then(() => undefined)}
      />
    );
  }
  if (kind === 'export') {
    return (
      <ConfirmDialog
        open
        title={`Export ${customer.name}’s data?`}
        body={
          <p>
            Their data downloads as a JSON file named customer-{customer.id}.json. Their open export request,
            if there is one, is marked done.
          </p>
        }
        confirm="Export"
        onClose={onClose}
        onConfirm={() => exporter.mutateAsync(customer).then(() => undefined)}
      />
    );
  }
  return (
    <ConfirmDialog
      open
      title={`Anonymise ${customer.name}?`}
      body={
        <>
          <p>
            Their name and email are replaced and IMEIs on past orders are cut to the model code (TAC). Order
            amounts and payment records stay for accounting and tax.
          </p>
          <p className="mt-2 font-medium text-ink">This can’t be undone.</p>
        </>
      }
      confirm="Anonymise"
      kind="danger"
      onClose={onClose}
      onConfirm={() => anonymize.mutateAsync(customer).then(() => undefined)}
    />
  );
}
