// CustomFieldsSection: "Custom Fields", the second section of the edit view's Field part: the fields a buyer fills in when ordering, as a
// dense table of inputs in the buyer's order, with Add a field and its own Save. Saving replaces the whole list (useCustomFieldsForm).
// The shop's order form draws only these fields (decision 029), so an IMEI service needs one of them marked Main input: the section warns
// when its draft has none (the service's type is `service.type`, the record the editor already loaded).
import { Button, DataTable, Icon, SectionHeading, SectionForm, useReportDirty } from '@/components/ui';
import { useCustomFieldsForm } from '../../../../../hooks/useCustomFieldsForm';
import { blankField } from '../../../../../lib/fields';
import { customFieldColumns } from './customFieldColumns';
import { MainInputWarning } from './MainInputWarning';
import type { FieldsSectionProps } from './sectionProps';

/** The section: a note, the main input warning when it applies, the table (or the line saying there are none), and the buttons. */
export function CustomFieldsSection({ service, lock, onDirtyChange }: FieldsSectionProps) {
  const { form, list, submit, setMainInput } = useCustomFieldsForm(service);
  const { isDirty } = form.formState;
  useReportDirty(isDirty, onDirtyChange);

  const rows = list.fields.map((field, index) => ({ id: field.id, index }));
  const drafts = form.watch('fields');
  const mainInputs = drafts.map((draft) => draft.isMainInput);
  const columns = customFieldColumns({
    form,
    types: drafts.map((draft) => draft.fieldType),
    mainInputs,
    count: rows.length,
    lock,
    onMove: list.move,
    onRemove: (index) => list.remove(index),
    onMainInput: setMainInput,
  });

  return (
    <>
      <SectionHeading as="h3">Custom Fields</SectionHeading>
      <SectionForm
        label="Custom Fields"
        onSubmit={submit}
        dirty={isDirty}
        lock={lock}
        placement="edge"
        actions={
          <Button
            size="sm"
            disabled={lock.disabled}
            title={lock.title}
            onClick={() => list.append(blankField())}
          >
            <Icon name="plus" className="ic-sm" />
            Add a field
          </Button>
        }
      >
        <p className="mb-3 text-sm text-ink2">
          What the buyer fills in when ordering, in this order: the order form shows only these fields. The
          name is what the supplier receives; the label is what buyers read (it is the name when left empty).
          A field made by the supplier import keeps the answer pattern the import gave it: the pattern is not
          shown here and saving leaves it as it is.
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
      </SectionForm>
    </>
  );
}
