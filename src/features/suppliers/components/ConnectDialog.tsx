// ConnectDialog: "Connect supplier" (the demo's `sup-connect` action): name, API type, base URL, account, API key, currency and
// limits. The demo faked the save ("This demo has no real suppliers to connect to"); here `POST /admin/suppliers` stores the
// supplier, and the page offers to test the connection right after.
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog } from '@/components/ui';
import { useCreateSupplier } from '../hooks/useSupplierMutations';
import { SUPPLIER_FIELDS, toCreateBody, type SupplierFormValues } from '../lib/input';
import type { SupplierDetail } from '../types';
import { SupplierFields } from './SupplierFields';

const EMPTY: SupplierFormValues = {
  name: '',
  driver: 'dhru',
  baseUrl: '',
  username: '',
  apiKey: '',
  currency: 'USD',
  lowBalanceAlert: '',
  maxConcurrency: '',
  rateLimitPerMin: '',
  timeoutMs: '',
};

export interface ConnectDialogProps {
  onClose: () => void;
  /** Called after the supplier was saved and the dialog closed, with the new supplier. */
  onConnected: (supplier: SupplierDetail) => void;
}

/** Mounted only while open, so every opening starts with empty fields; the supplier it made is handed on after it closes. */
export function ConnectDialog({ onClose, onConnected }: ConnectDialogProps) {
  const create = useCreateSupplier();
  const created = useRef<SupplierDetail | undefined>(undefined);
  const form = useForm<SupplierFormValues>({ defaultValues: EMPTY });

  const submit = dialogSubmit(
    form,
    async (values) => {
      created.current = await create.mutateAsync(toCreateBody(values));
    },
    { fields: SUPPLIER_FIELDS },
  );

  return (
    <FormDialog
      open
      title="Connect supplier"
      sub="The API key is stored encrypted and is never shown again."
      confirm="Connect"
      onClose={() => (created.current ? onConnected(created.current) : onClose())}
      onSubmit={submit}
    >
      <SupplierFields form={form} editing={false} />
    </FormDialog>
  );
}
