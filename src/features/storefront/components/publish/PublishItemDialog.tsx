// PublishItemDialog: edits one row of a draft: the title, the address, the brand, the carrier, the country and the shop price. Only
// the keys staff changed are sent; the row comes back worked out again by the server, and a refusal lands under its field. "Save
// and next" saves and then asks the SERVER for the next row (the same search and filters, in the order of the rows), so it still
// finds the next row when the saved one left the filter. The price group is locked without `storefront:update`.
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, dialogSubmit, FormDialog, toast } from '@/components/ui';
import type { Id } from '@/lib/api';
import { useNextPublishItem } from '../../hooks/usePublishNext';
import { useUpdatePublishItem } from '../../hooks/usePublishMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { isEmptyBody, itemBody, itemValues, type ItemValues } from '../../lib/publishItemForm';
import { refusalText } from '../../lib/publish';
import type { PublishItem, PublishItemFilters } from '../../types';
import { PublishItemFields } from './PublishItemFields';
import { PublishPriceChoice } from './PublishPriceChoice';

export interface PublishItemDialogProps {
  runId: Id;
  item: PublishItem;
  grants: StorefrontGrants;
  /** The table's search text and filters: "Save and next" walks the rows under them. */
  q: string;
  filters: PublishItemFilters;
  /** Shows another row in the dialog (the next one). The parent keys the dialog by row. */
  onOpenItem: (item: PublishItem) => void;
  onClose: () => void;
}

const FIELDS = ['title', 'slug', 'brand', 'carrier', 'country', 'retailPrice', 'price'];

/** The dialog of one row. */
export function PublishItemDialog({
  runId,
  item,
  grants,
  q,
  filters,
  onOpenItem,
  onClose,
}: PublishItemDialogProps) {
  const [current, setCurrent] = useState(item);
  const [resetError, setResetError] = useState<string | null>(null);
  const update = useUpdatePublishItem(runId);
  const findNext = useNextPublishItem(runId);
  const form = useForm<ItemValues>({ defaultValues: itemValues(item) });
  const priceLock = grants.needs('storefront:update');
  // Which button sent the form: "Save and next" sets it before the submit; it is reset when the submit is over.
  const goNext = useRef(false);

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = goNext.current;
      const body = itemBody(values, current, !priceLock.disabled);
      if (!isEmptyBody(body)) await update.mutateAsync({ itemId: current.id, body });
      else if (!next) toast({ kind: 'info', title: 'Nothing changed' });
      if (!next) return;
      const following = await findNext({ q, filters, afterId: current.id });
      if (following) {
        onOpenItem(following);
        return false;
      }
      toast({ kind: 'info', title: 'That was the last one.' });
    },
    // The server names the price choice `pricing`; the form's radio group is `price`.
    { fields: FIELDS, aliases: { pricing: 'price' } },
  );

  const reset = async () => {
    setResetError(null);
    try {
      const answered = await update.mutateAsync({ itemId: current.id, body: { reset: true } });
      setCurrent(answered);
      form.reset(itemValues(answered));
    } catch (failure) {
      setResetError(refusalText(failure));
    }
  };

  return (
    <FormDialog
      open
      size="lg"
      title="Edit row"
      sub={current.service.code}
      confirm="Save"
      error={resetError}
      pending={update.isPending}
      onClose={onClose}
      onSubmit={async (event) => {
        const result = await submit(event);
        goNext.current = false;
        return result;
      }}
      extra={
        <Button
          type="submit"
          disabled={update.isPending}
          onClick={() => {
            goNext.current = true;
          }}
        >
          Save and next
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="label">Supplier&apos;s name</p>
          <p className="text-sm" dir="auto">
            {current.service.name}
          </p>
          <p className="mono text-xs text-ink3">
            {current.service.code} · {current.service.type} · {current.service.categoryName}
          </p>
        </div>
        <PublishItemFields form={form} />
        <PublishPriceChoice item={current} form={form} lock={priceLock} />
        <Button
          variant="ghost"
          size="sm"
          disabled={!current.edited || update.isPending}
          title={current.edited ? undefined : 'Nothing was changed on this row.'}
          onClick={() => void reset()}
        >
          Reset to what was detected
        </Button>
      </div>
    </FormDialog>
  );
}
