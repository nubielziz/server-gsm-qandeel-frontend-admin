// GroupPricesPanelForm: the group prices form of the panel's Prices section, once the saved prices and the merchant groups are loaded.
// It has no box for the storefront's retail group (that price has its own block); the retail row is still sent back, as the dialog does.
import { useEffect, type ReactNode } from 'react';
import { FormSection } from '@/components/ui';
import { useGroupPricesForm } from '../../../hooks/useGroupPricesForm';
import type { ClientGroup, Service, ServiceGroupPrice } from '../../../types';
import { GroupPricesBody } from '../../GroupPricesBody';

export interface GroupPricesPanelFormProps {
  service: Service;
  groups: readonly ClientGroup[];
  saved: readonly ServiceGroupPrice[];
  lock: { disabled: boolean; title?: string };
  note?: ReactNode;
  /** Says whether the boxes hold unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
}

/** One box per merchant group but the retail one, with its own Save. */
export function GroupPricesPanelForm({
  service,
  groups,
  saved,
  lock,
  note,
  onDirtyChange,
}: GroupPricesPanelFormProps) {
  const { form, submit, listed } = useGroupPricesForm({ service, groups, saved, hideRetail: true });
  const { isDirty } = form.formState;
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <FormSection
      onSubmit={submit}
      submitLabel="Save group prices"
      submitDisabled={lock.disabled}
      submitTitle={lock.title}
      dirty={isDirty}
    >
      <GroupPricesBody groups={listed} form={form} lock={lock} note={note} />
      {listed.length === 0 && (
        <p className="text-sm text-ink3">There are no merchant groups to price here.</p>
      )}
    </FormSection>
  );
}
