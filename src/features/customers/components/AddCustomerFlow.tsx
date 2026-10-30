// AddCustomerFlow: the whole "add a customer" journey of the list page. The form first; then, when the server made a temporary
// password, the one-time dialog that shows it; then the new customer's Account tab (the demo's `go('customers', { id })`).
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RevealPasswordDialog } from '@/features/access';
import { customerPath } from '../lib/detailTabs';
import type { CreateCustomerResult } from '../types';
import { AddCustomerDialog } from './AddCustomerDialog';

/** Mounted only while the journey runs; `onClose` is called when the person cancels the form. */
export function AddCustomerFlow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [shown, setShown] = useState<CreateCustomerResult | null>(null);

  const open = (created: CreateCustomerResult) => navigate(customerPath(created.id, 'account'));

  if (shown?.temporaryPassword) {
    return (
      <RevealPasswordDialog
        name={shown.name}
        password={shown.temporaryPassword}
        onClose={() => open(shown)}
      />
    );
  }
  return (
    <AddCustomerDialog
      onClose={onClose}
      onCreated={(created) => (created.temporaryPassword ? setShown(created) : open(created))}
    />
  );
}
