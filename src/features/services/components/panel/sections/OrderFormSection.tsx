// OrderFormSection: the "Order form" part of the service panel (the Catalog page's side panel): a summary of the custom fields a buyer
// fills in and of the model, network and MEP lists, with two buttons that open the existing Fields and Options dialogs.
import { useState } from 'react';
import { QueryState, SkeletonTable } from '@/components/ui';
import { useServiceDetail } from '../../../hooks/useServiceDetail';
import { FieldsDialog } from '../../FieldsDialog';
import { OptionsDialog } from '../../OptionsDialog';
import type { PanelSectionProps } from '../types';
import { OrderFormFields } from './OrderFormFields';
import { OrderFormOptions } from './OrderFormOptions';

/** Which of the two dialogs the section has open, if any. */
type OpenDialog = 'fields' | 'options' | null;

/**
 * Reads the service's detail and shows what the buyer fills in and picks from. The dialogs are the row menu's own: they read the
 * detail themselves, save with their own mutations and close on success, and the save refreshes the detail this summary reads.
 * Both buttons need `catalog:update`, as the row menu's "Fields…" and "Options…" do. The section edits nothing in place, so it
 * holds no unsaved changes and never calls `onDirtyChange`. The panel draws its heading and frame.
 */
export function OrderFormSection({ service, grants }: PanelSectionProps) {
  const { detail, query } = useServiceDetail(service.id);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const close = () => setDialog(null);
  const lock = grants.needs('catalog:update');
  // A refetch that fails after a good read keeps the summary on screen: only a read with nothing to show is an error.
  const failed = !detail && query.isError;

  return (
    <>
      <QueryState
        isLoading={!detail && !failed}
        isError={failed}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Could not load the order form"
        skeleton={<SkeletonTable cols={2} rows={3} />}
      >
        {detail && (
          <div className="space-y-4">
            <OrderFormFields fields={detail.fields} lock={lock} onEdit={() => setDialog('fields')} />
            <OrderFormOptions options={detail.options} lock={lock} onEdit={() => setDialog('options')} />
          </div>
        )}
      </QueryState>
      {dialog === 'fields' && <FieldsDialog service={service} onClose={close} />}
      {dialog === 'options' && <OptionsDialog service={service} onClose={close} />}
    </>
  );
}
