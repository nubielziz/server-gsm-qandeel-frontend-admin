// OptionsSection: "Options", the third section of the edit view's Field part: the model, network and MEP lists a buyer picks from, one text box
// each with one entry per line, and its own Save. Saving replaces all three lists together (useOptionsForm).
import { SectionHeading, TextareaField, SectionForm, useReportDirty } from '@/components/ui';
import { useOptionsForm } from '../../../../../hooks/useOptionsForm';
import { entriesText, parseOptionLines } from '../../../../../lib/options';
import { OPTION_LISTS } from '../../../../../lib/status';
import type { FieldsSectionProps } from './sectionProps';

/** The section: how an entry is written, then one box per list with its count of entries. */
export function OptionsSection({ service, lock, onDirtyChange }: FieldsSectionProps) {
  const { form, submit } = useOptionsForm(service);
  const {
    register,
    watch,
    formState: { errors, isDirty },
  } = form;
  useReportDirty(isDirty, onDirtyChange);

  return (
    <>
      <SectionHeading as="h3">Options</SectionHeading>
      <SectionForm label="Options" onSubmit={submit} dirty={isDirty} lock={lock}>
        <p className="mb-1 text-sm text-ink2">
          One entry per line: <span className="mono">value | label | supplier value</span>. The label and the
          supplier value are optional; without a label the value is shown.
        </p>
        {OPTION_LISTS.map((list) => (
          <TextareaField
            key={list.id}
            layout="row"
            label={list.label}
            rows={4}
            className="mono max-w-2xl"
            spellCheck={false}
            disabled={lock.disabled}
            title={lock.title}
            hint={`${list.hint} ${entriesText(parseOptionLines(watch(list.id), list.id).length)}.`}
            error={errors[list.id]}
            {...register(list.id)}
          />
        ))}
      </SectionForm>
    </>
  );
}
