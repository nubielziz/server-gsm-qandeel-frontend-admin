// BulkPriceDialog: "Bulk price change" in two steps (`POST /admin/services/bulk-price/preview`, then `/apply` with the same body).
// Step one picks the services (a category or the ticked ones) and the change; Preview shows every old and new price with the
// server's below-floor warnings; Apply saves them. The map adds this action; the demo changed prices one service at a time.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, dialogSubmit, FormDialog } from '@/components/ui';
import { useApplyBulkPrice, usePreviewBulkPrice } from '../hooks/useBulkPrice';
import { useCategories } from '../hooks/useChoices';
import { buildBulkBody, describeChange, servicesText, type BulkValues } from '../lib/bulk';
import type { BulkPriceBody, BulkPricePreview } from '../types';
import { BulkPriceFields } from './BulkPriceFields';
import { BulkPriceLines } from './BulkPriceLines';

export interface BulkPriceDialogProps {
  /** The ids of the services ticked in the table. */
  selectedIds: readonly number[];
  onClose: () => void;
  /** Called after the prices were applied, so the page can untick the services. */
  onApplied: () => void;
}

/** What the server said the change would do, with the body that asked. The same body is sent to apply. */
type Previewed = { body: BulkPriceBody; result: BulkPricePreview };

/** The two steps in one dialog: the form, then the server's preview with Apply. */
export function BulkPriceDialog({ selectedIds, onClose, onApplied }: BulkPriceDialogProps) {
  const categories = useCategories();
  const preview = usePreviewBulkPrice();
  const apply = useApplyBulkPrice();
  const [previewed, setPreviewed] = useState<Previewed | null>(null);
  const form = useForm<BulkValues>({
    defaultValues: {
      scope: selectedIds.length > 0 ? 'selected' : 'category',
      categoryId: '',
      direction: 'raise',
      type: 'percent',
      amount: '',
    },
  });

  const scope = form.watch('scope');

  const previewStep = dialogSubmit(
    form,
    async (values) => {
      const built = buildBulkBody(values, selectedIds);
      if ('error' in built) {
        form.setError(built.field, { type: 'validate', message: built.error }, { shouldFocus: true });
        return false;
      }
      setPreviewed({ body: built.body, result: await preview.mutateAsync(built.body) });
      // The dialog stays open on the preview.
      return false;
    },
    {
      // Every name here has an error line under its input; the category menu shows only when the scope is a category.
      fields: ['scope', 'direction', 'type', 'amount', ...(scope === 'category' ? ['categoryId'] : [])],
      // The body nests the change and names the ticked services `serviceIds`; the form has an amount and a scope.
      aliases: { serviceIds: 'scope', 'change.value': 'amount', 'change.type': 'type' },
    },
  );

  // The apply step has no fields of its own: a refusal is shown in the dialog's error slot.
  const applyStep = async () => {
    if (!previewed) return false;
    if (previewed.result.lines.length === 0) return 'No service would change.';
    await apply.mutateAsync(previewed.body);
    onApplied();
  };

  const count = previewed?.result.lines.length ?? 0;
  const under = previewed?.result.belowFloor ?? 0;
  return (
    <FormDialog
      open
      size="lg"
      title="Bulk price change"
      sub={
        previewed
          ? 'Check the new prices, then apply them.'
          : 'Preview first: nothing is saved until you apply.'
      }
      confirm={previewed ? `Apply to ${servicesText(count)}` : 'Preview'}
      onClose={onClose}
      onSubmit={previewed ? applyStep : previewStep}
    >
      {previewed ? (
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{describeChange(previewed.body.change)}</span>
            <span className="text-ink3">{servicesText(count)}</span>
            <Button size="sm" variant="ghost" onClick={() => setPreviewed(null)}>
              Change the settings
            </Button>
          </p>
          {under > 0 && (
            <p className="rounded-md bg-warn-bg p-2.5 text-sm text-warn-fg">
              {servicesText(under)} would end under their floor. Orders are charged the floor price until the
              price is raised.
            </p>
          )}
          <BulkPriceLines lines={previewed.result.lines} />
        </div>
      ) : (
        <BulkPriceFields
          form={form}
          categories={categories.categories}
          categoriesQuery={categories.query}
          selectedCount={selectedIds.length}
        />
      )}
    </FormDialog>
  );
}
