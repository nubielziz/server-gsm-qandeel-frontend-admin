// CustomFieldsSection: "Custom Fields", the one section of the edit view's Field part (decision 032): the fields a buyer fills in when ordering,
// as a dense table of inputs in the buyer's order with Add a field, then under it, on the same left edge, how the service sells by quantity
// (one per order, a range, or fixed packs) and ONE Save for both. Two form objects (the fields, the quantity) and one submit handler:
// useFieldsSectionForm. The shop's order form draws only these fields (decision 029) and each is judged by its own type, Required tick and
// pattern (decision 031): an IMEI service forces nothing, but the section advises marking one Main input when its draft has none (the
// service's type is `service.type`, the record the editor already loaded).
import { useId } from 'react';
import {
  Button,
  CheckboxField,
  DataTable,
  Icon,
  SectionForm,
  SectionHeading,
  useReportDirty,
} from '@/components/ui';
import { useFieldsSectionForm } from '../../../../../hooks/useFieldsSectionForm';
import { blankField, hasLabelToClear } from '../../../../../lib/fields';
import { customFieldColumns } from './customFieldColumns';
import { FieldsHelp } from './FieldsHelp';
import { MainInputWarning } from './MainInputWarning';
import { QuantityControls } from './QuantityControls';
import type { FieldsSectionProps } from './sectionProps';

/** The line under the tick box while it is unticked and a row still holds a label that differs from its name. */
const LABELS_CLEARED_HINT = "Saving now removes the different labels: buyers will see each field's name.";

/**
 * The section, top to bottom on one left edge: the heading, one sentence with the "How this works" disclosure, the main input warning when
 * it applies, the "Show buyers a different label" tick box (it draws the Label column for every row, decision 035), the table (or the line saying there are none), Add a field, a thin rule, the quantity (QuantityControls) and the one Save.
 * It tells the host it holds unsaved changes while either the fields or the quantity do.
 */
export function CustomFieldsSection({ service, lock, onDirtyChange }: FieldsSectionProps) {
  const { form, list, setMainInput, labels, quantityForm, dirty, submit } = useFieldsSectionForm(service);
  useReportDirty(dirty, onDirtyChange);
  // The Main input item of the help list: the tick boxes of its column point at it.
  const mainInputId = useId();

  const rows = list.fields.map((field, index) => ({ id: field.id, index }));
  const drafts = form.watch('fields');
  const mainInputs = drafts.map((draft) => draft.isMainInput);
  // Unticked with a label that differs from its name: a save sends every label empty, so say so before it happens.
  const clearsLabels = !labels.shown && hasLabelToClear(drafts);
  const columns = customFieldColumns({
    form,
    types: drafts.map((draft) => draft.fieldType),
    showLabels: labels.shown,
    count: rows.length,
    lock,
    introId: mainInputId,
    onMove: list.move,
    onRemove: (index) => list.remove(index),
    onMainInput: setMainInput,
  });

  return (
    <>
      <SectionHeading as="h3">Custom Fields</SectionHeading>
      <SectionForm label="Custom Fields" onSubmit={submit} dirty={dirty} lock={lock} placement="edge">
        <FieldsHelp mainInputId={mainInputId} />
        <MainInputWarning serviceType={service.type} hasMainInput={mainInputs.some(Boolean)} />
        <CheckboxField
          label="Show buyers a different label"
          hint={clearsLabels ? LABELS_CLEARED_HINT : undefined}
          wrapperClassName="mb-2"
          checked={labels.shown}
          disabled={lock.disabled || labels.forced}
          title={lock.title}
          onChange={(event) => labels.setShown(event.target.checked)}
        />
        <DataTable
          skin="list"
          footer={false}
          caption="Custom fields"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={
            <p className="py-2 text-sm text-ink3">
              No custom fields. The order form shows no input box: add the fields the buyer must fill in.
            </p>
          }
        />
        <div className="mt-2">
          <Button
            size="sm"
            disabled={lock.disabled}
            title={lock.title}
            onClick={() => list.append(blankField())}
          >
            <Icon name="plus" className="ic-sm" />
            Add a field
          </Button>
        </div>
        <QuantityControls form={quantityForm} lock={lock} />
      </SectionForm>
    </>
  );
}
