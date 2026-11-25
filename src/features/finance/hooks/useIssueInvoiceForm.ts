// The form of the Issue invoice view with its save: one create call, and a refusal of the server under the field it names. What the form
// cannot place shows beside the Issue invoice button. New in the console (MISMATCHES M123).
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerErrors } from '@/lib/api';
import { normalizeAmount } from '../lib/invoices';
import type { Invoice } from '../types';
import { useCreateInvoice } from './useCreateInvoice';

/** What the person types: the merchant's account id (the menu's value), the amount as text, and what the invoice is for. */
export type IssueInvoiceValues = { clientId: string; amount: string; description: string };

/** The form's field names, so a server message about any other field still shows beside the button. */
export const ISSUE_INVOICE_FIELDS = ['clientId', 'amount', 'description'] as const;

export interface UseIssueInvoiceFormOptions {
  /** The invoice was issued; the view opens it. */
  onIssued: (invoice: Invoice) => void;
}

/**
 * The form, its `submit` (the form's `onSubmit`), whether the save is running and `problem`: what the server said that belongs to no field.
 *
 * A second submit (a fast double click, Enter twice) while the first is running or has succeeded sends nothing: one press bills one invoice.
 *
 * Side effects: `POST /admin/invoices`; the invoice lists are read again; a success toast (see useCreateInvoice).
 * @returns the form object, the submit handler, the pending flag and the unplaced message (null when there is none).
 */
export function useIssueInvoiceForm({ onIssued }: UseIssueInvoiceFormOptions) {
  const create = useCreateInvoice();
  const form = useForm<IssueInvoiceValues>({ defaultValues: { clientId: '', amount: '', description: '' } });
  const [problem, setProblem] = useState<string | null>(null);
  // Set before the first await: the form's checks and the request take a moment, and a second submit can start inside that gap.
  // Cleared only when the call fails; after a success the view moves on to the new invoice.
  const sending = useRef(false);

  const submit = form.handleSubmit(async (values) => {
    if (sending.current) return;
    setProblem(null);
    const amount = normalizeAmount(values.amount);
    // The form already checked the amount; this keeps the types honest.
    if (!amount) return;
    sending.current = true;
    try {
      onIssued(
        await create.mutateAsync({
          clientId: Number(values.clientId),
          amount,
          description: values.description.trim(),
        }),
      );
    } catch (error) {
      sending.current = false;
      const rest = applyServerErrors(error, form.setError, { fields: ISSUE_INVOICE_FIELDS });
      setProblem(rest.length > 0 ? rest.join(' ') : null);
    }
  });

  return { form, submit, pending: create.isPending, problem };
}
