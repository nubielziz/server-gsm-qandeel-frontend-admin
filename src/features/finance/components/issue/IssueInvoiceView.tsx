// IssueInvoiceView: Books › +Issue invoice: the manual invoice form as a full view (it was a dialog of the Invoices tab). One label-left form
// that ends in the pinned "Issue invoice" bar; once the invoice is issued its drawer opens on the Invoices view. Leaving the form with
// typing in it asks first. New in the console (MISMATCHES M123).
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  PinnedBar,
  SectionHeading,
  UnsavedGuard,
  useDirtyMark,
  useReportDirty,
} from '@/components/ui';
import { useFinanceGrants } from '../../hooks/useFinanceGrants';
import { useIssueInvoiceForm } from '../../hooks/useIssueInvoiceForm';
import { useMerchantOptions } from '../../hooks/useMerchantOptions';
import { financeInvoicePath } from '../../lib/tabs';
import { IssueInvoiceFields } from './IssueInvoiceFields';

/**
 * The view. Issuing needs `invoices:create`, and the merchant menu needs `clients:read` (the page shows the view only to a role that has
 * both and `invoices:read`). A refusal that names a field shows under it; the rest shows beside the button.
 *
 * Why: staff bill a merchant for an amount outside the wallet top-up flow (a setup fee, a manual adjustment): the map's create-invoice route.
 * Side effects: one `POST /admin/invoices`; a success toast; then the new invoice's drawer is opened on the Invoices view.
 */
export function IssueInvoiceView() {
  const navigate = useNavigate();
  const grants = useFinanceGrants();
  const merchants = useMerchantOptions(grants.can('clients:read'));
  const [done, setDone] = useState(false);

  const { form, submit, pending, problem } = useIssueInvoiceForm({
    onIssued: (invoice) => {
      setDone(true);
      void navigate(financeInvoicePath(invoice.id));
    },
  });

  // Typing is lost when the view is left: the guard asks first, and the browser asks before a reload. Once the invoice exists nothing is.
  const mark = useDirtyMark('issue-invoice');
  useReportDirty(form.formState.isDirty && !done, mark.report);

  const lock = grants.can('invoices:create') ? grants.needs('clients:read') : grants.needs('invoices:create');
  return (
    <>
      <form className="view-frame" noValidate onSubmit={(event) => void submit(event)}>
        <div>
          <SectionHeading>Issue invoice</SectionHeading>
          <p className="mb-2 text-sm text-ink3">
            Bills a merchant for an amount outside the wallet top-up flow.
          </p>
          <IssueInvoiceFields form={form} merchants={merchants} />
        </div>
        <PinnedBar>
          <Button
            type="submit"
            variant="primary"
            loading={pending || form.formState.isSubmitting}
            disabled={lock.disabled || done}
            title={lock.title}
          >
            Issue invoice
          </Button>
          {lock.disabled && lock.title && <span className="text-xs text-ink3">{lock.title}</span>}
          {problem && (
            <span role="alert" className="text-sm text-crit-fg">
              {problem}
            </span>
          )}
        </PinnedBar>
      </form>
      <UnsavedGuard active={mark.dirty} what="Issue invoice" />
    </>
  );
}
