// CustomFieldsSection: "Custom Fields", the second section of the edit view's Field part: the fields a buyer fills in when ordering, as a
// dense table of inputs in the buyer's order, with Add a field and its own Save. Saving replaces the whole list (useCustomFieldsForm).
import { Button, DataTable, Icon, SectionHeading, SectionForm, useReportDirty } from '@/components/ui';
import { useCustomFieldsForm } from '../../../../../hooks/useCustomFieldsForm';
import { blankField } from '../../../../../lib/fields';
import { customFieldColumns } from './customFieldColumns';
import type { FieldsSectionProps } from './sectionProps';

/** The section: a note, the table (or the line saying there are none), and the buttons. */
export function CustomFieldsSection({ service, lock, onDirtyChange }: FieldsSectionProps) {
  const { form, list, submit, setMainInput } = useCustomFieldsForm(service);
  const { isDirty } = form.formState;
  useReportDirty(isDirty, onDirtyChange);

  const rows = list.fields.map((field, index) => ({ id: field.id, index }));
  const drafts = form.watch('fields');
  const columns = customFieldColumns({
    form,
    types: drafts.map((draft) => draft.fieldType),
    mainInputs: drafts.map((draft) => draft.isMainInput),
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
          What the buyer fills in when ordering, in this order. The name is what the supplier receives; the
          label is what buyers read (it is the name when left empty). A pattern is a regular expression the
          answer must match; it is optional.
        </p>
        <DataTable
          skin="list"
          footer={false}
          caption="Custom fields"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={
            <p className="py-2 text-sm text-ink3">
              No custom fields. The buyer only gives the main input (an IMEI, an account, a serial number).
            </p>
          }
        />
      </SectionForm>
    </>
  );
}
