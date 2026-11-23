// MerchantPriceForm: the first form of the panel's Prices section: the merchant price and the minimum profit of one service. It saves by
// itself and stays open. The cost, the floor, the margin and the below-floor words are the server's, as the row or the last save gave them.
import { useEffect } from 'react';
import { FormSection } from '@/components/ui';
import { useEditPriceForm } from '../../../hooks/useEditPriceForm';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import type { Service } from '../../../types';
import { EditPriceBody } from '../../EditPriceBody';

export interface MerchantPriceFormProps {
  service: Service;
  grants: ServiceGrants;
  /** Says whether the boxes hold unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Saving a price needs `catalog:update` (the route) and `pricing:update` (the server's second permission for a price or a minimum
 * profit); a role that lacks one sees the boxes disabled with the missing permission named.
 */
export function MerchantPriceForm({ service, grants, onDirtyChange }: MerchantPriceFormProps) {
  const lock = grants.needsAll('catalog:update', 'pricing:update');
  const { form, submit, saved } = useEditPriceForm(service, { stay: true });
  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <FormSection
      onSubmit={submit}
      submitLabel="Save merchant price"
      savedText="Merchant price saved"
      submitDisabled={lock.disabled}
      submitTitle={lock.title}
      dirty={isDirty}
    >
      <EditPriceBody service={saved} form={form} lock={lock} figures />
    </FormSection>
  );
}
