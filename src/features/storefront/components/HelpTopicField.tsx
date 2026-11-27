// HelpTopicField: the Topic input of the help article form (decision 036). A menu of the topics the articles already use, sorted, with
// "New topic…" to type one more; a topic that is not in the list stays chosen and shown. With no article yet there is no menu, only the box.
import { useState } from 'react';
import { useController, type Control } from 'react-hook-form';
import { SelectField, TextField, type SelectOption } from '@/components/ui';

/** The menu's own word for "type another topic"; no topic is ever called this. */
const NEW_TOPIC = '__new_topic__';

/** The values of the help article form; the topic text is in `category`, which is what is sent. */
export type HelpFormValues = { category: string; question: string; answerMd: string; isPublished: boolean };

export interface HelpTopicFieldProps {
  control: Control<HelpFormValues>;
  /** The topics the articles use, sorted. */
  topics: readonly string[];
  /** The articles are still being read: the menu waits instead of the box flashing. */
  loading: boolean;
}

/** The menu of topics, plus the box for a new one. */
export function HelpTopicField({ control, topics, loading }: HelpTopicFieldProps) {
  const { field, fieldState } = useController({
    name: 'category',
    control,
    rules: { validate: (value) => value.trim() !== '' || 'Enter a topic.' },
  });
  const [typed, setTyped] = useState(false);
  const menu = loading || topics.length > 0;
  const known = topics.includes(field.value);
  const options: SelectOption[] = [
    { value: '', label: loading ? 'Loading topics…' : 'Choose a topic…' },
    ...topics.map((topic) => ({ value: topic, label: topic })),
    // A topic the list does not know (not read yet, or kept from before) stays chosen, as it is.
    ...(field.value !== '' && !typed && !known ? [{ value: field.value, label: field.value }] : []),
    { value: NEW_TOPIC, label: 'New topic…' },
  ];
  const boxShown = typed || !menu;
  const box = (
    <TextField
      label={menu ? 'New topic' : 'Topic'}
      autoComplete="off"
      hint={menu ? undefined : 'Orders, Unlocking, Payments, IMEI, Privacy…'}
      error={fieldState.error}
      name={field.name}
      ref={field.ref}
      value={field.value}
      onBlur={field.onBlur}
      onChange={field.onChange}
    />
  );
  if (!menu) return box;
  return (
    <div className="space-y-3">
      <SelectField
        label="Topic"
        selectWrapClassName="w-full"
        options={options}
        value={typed ? NEW_TOPIC : field.value}
        disabled={loading}
        error={typed ? undefined : fieldState.error}
        ref={boxShown ? undefined : field.ref}
        onBlur={field.onBlur}
        onChange={(event) => {
          const value = event.target.value;
          if (value === NEW_TOPIC) {
            // A topic picked from the list is not what "New topic" means: the box starts empty.
            setTyped(true);
            field.onChange('');
            return;
          }
          setTyped(false);
          field.onChange(value);
        }}
      />
      {typed && box}
    </div>
  );
}
