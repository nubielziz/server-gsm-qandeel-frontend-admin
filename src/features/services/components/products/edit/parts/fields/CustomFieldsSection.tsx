// CustomFieldsSection: "Custom Fields", the one section of the edit view's Field part (decision 032): the fields a buyer fills in when ordering,
// as a dense table of inputs in the buyer's order with Add a field, then under it how the service sells by quantity (one per order, a
// range, or fixed packs) and ONE Save for both. Two form objects (the fields, the quantity) and one submit handler: useFieldsSectionForm.
// The shop's order form draws only these fields (decision 029) and each is judged by its own type, Required tick and pattern (decision 031):
// an IMEI service forces nothing, but the section advises marking one Main input when its draft has none (the service's type is
// `service.type`, the record the editor already loaded).
import { useId } from 'react';
import { useWatch } from 'react-hook-form';
import {
  Button,
  DataTable,
  Icon,
  SectionForm,
  SectionHeading,
  SelectField,
  TextField,
  useReportDirty,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { useFieldsSectionForm } from '../../../../../hooks/useFieldsSectionForm';
import { blankField } from '../../../../../lib/fields';
import { maxProblem, minProblem, packsProblem, type QuantityMode } from '../../../../../lib/quantity';
import { customFieldColumns } from './customFieldColumns';
import { MainInputWarning } from './MainInputWarning';
import type { FieldsSectionProps } from './sectionProps';

const MODE_OPTIONS: readonly SelectOption[] = [
  { value: 'single', label: 'One per order' },
  { value: 'range', label: 'A range' },
  { value: 'packs', label: 'Fixed packs' },
];

// What each way means to the buyer, under the menu.
const MODE_WORDS: Record<QuantityMode, string> = {
  single: 'Every order is for 1 unit.',
  range: 'The buyer chooses any whole quantity from the smallest to the largest.',
  packs: 'The buyer chooses one of the pack sizes you list.',
};

/**
 * The section: a note, the main input warning when it applies, the table (or the line saying there are none), Add a field, the quantity
 * menu with the boxes its way needs (the checks are lib/quantity.ts), and the one Save. It tells the host it holds unsaved changes while
 * either the fields or the quantity do.
 */
export function CustomFieldsSection({ service, lock, onDirtyChange }: FieldsSectionProps) {
  const { form, list, setMainInput, quantityForm, dirty, submit } = useFieldsSectionForm(service);
  useReportDirty(dirty, onDirtyChange);
  // The intro sentence about the main input: the tick boxes of its column point at it.
  const mainInputId = useId();
  const {
    register,
    control,
    formState: { errors },
  } = quantityForm;
  const mode = useWatch({ control, name: 'quantityMode' });

  const rows = list.fields.map((field, index) => ({ id: field.id, index }));
  const drafts = form.watch('fields');
  const mainInputs = drafts.map((draft) => draft.isMainInput);
  const columns = customFieldColumns({
    form,
    types: drafts.map((draft) => draft.fieldType),
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
      <SectionForm label="Custom Fields" onSubmit={submit} dirty={dirty} lock={lock}>
        <p className="mb-3 text-sm text-ink2">
          What the buyer fills in when ordering, in this order: the order form shows only these fields. Name:
          what the supplier receives. Label: what buyers read (the name when left empty). The IMEI type takes
          one 15-digit IMEI with a valid check digit.{' '}
          <span id={mainInputId}>
            Main input: the one field the order is about (IMEI, serial, ECID). The supplier receives it as the
            IMEI, and order lists show it.
          </span>{' '}
          A pattern the supplier import gave a field is kept as it is and not shown here.
        </p>
        <MainInputWarning serviceType={service.type} hasMainInput={mainInputs.some(Boolean)} />
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
        <div className="mb-5 mt-3">
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
        <SelectField
          layout="row"
          label="Quantity"
          options={MODE_OPTIONS}
          selectWrapClassName="w-full max-w-md"
          disabled={lock.disabled}
          title={lock.title}
          hint={`${MODE_WORDS[mode]} The price is for one unit. An order costs the price times its quantity.`}
          {...register('quantityMode')}
        />
        {mode === 'range' && (
          <>
            <TextField
              layout="row"
              label="Smallest"
              inputMode="numeric"
              autoComplete="off"
              disabled={lock.disabled}
              title={lock.title}
              error={errors.minQty}
              {...register('minQty', { validate: (_value, all) => minProblem(all), deps: 'maxQty' })}
            />
            <TextField
              layout="row"
              label="Largest"
              inputMode="numeric"
              autoComplete="off"
              disabled={lock.disabled}
              title={lock.title}
              error={errors.maxQty}
              {...register('maxQty', { validate: (_value, all) => maxProblem(all) })}
            />
          </>
        )}
        {mode === 'packs' && (
          <TextField
            layout="row"
            label="Pack sizes"
            autoComplete="off"
            spellCheck={false}
            disabled={lock.disabled}
            title={lock.title}
            hint="Whole numbers separated by commas, for example 5, 10, 25."
            error={errors.qtyOptions}
            {...register('qtyOptions', { validate: (_value, all) => packsProblem(all) })}
          />
        )}
      </SectionForm>
    </>
  );
}
