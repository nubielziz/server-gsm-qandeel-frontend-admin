// ComponentsField: the "Affected components" field of the Declare incident dialog. A checkbox per checked component of the
// platform; when the list cannot be read, the keys are typed instead. Ports no demo page.
import { useState } from 'react';
import { Skeleton, TextField } from '@/components/ui';
import { sortProblemsFirst, statusMeta } from '../../lib';
import { CheckGroup, type CheckOption } from './CheckGroup';
import { splitKeys } from './incidents';
import { useAffectedComponents } from './useAffectedComponents';

export interface ComponentsFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** The keys the form started with (an alert's prefill). They stay choices even if the summary does not list them. */
  initial: readonly string[];
  error?: string;
}

/** Typed keys, for a role that cannot read the health summary. The text is kept here so a trailing comma survives typing. */
function KeysField({ value, onChange, error }: Pick<ComponentsFieldProps, 'value' | 'onChange' | 'error'>) {
  const [text, setText] = useState(value.join(', '));
  return (
    <TextField
      label="Affected components"
      hint="The list of components could not be loaded. Type their keys, separated by commas (for example api, supplier:3)."
      error={error}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(splitKeys(event.target.value));
      }}
    />
  );
}

/**
 * The server accepts only known keys (422 on `components` otherwise), so the choices are the platform's checked components,
 * the broken ones first and with their status word.
 */
export function ComponentsField({ value, onChange, initial, error }: ComponentsFieldProps) {
  const { components, loading } = useAffectedComponents();
  if (loading) return <Skeleton height={56} />;
  if (!components) return <KeysField value={value} onChange={onChange} error={error} />;
  // Problems first, as the server's checks say: the component that is down is the one an incident is most likely about.
  const options: CheckOption[] = sortProblemsFirst(components, (component) => component.status).map(
    (component) => ({
      value: component.key,
      label: (
        <>
          {component.name}
          {component.status !== 'ok' && (
            <span className="text-ink3"> · {statusMeta(component.status).word}</span>
          )}
        </>
      ),
    }),
  );
  for (const key of initial) {
    if (!options.some((option) => option.value === key)) {
      options.push({ value: key, label: <span className="mono">{key}</span> });
    }
  }
  return (
    <CheckGroup
      legend="Affected components"
      options={options}
      value={value}
      onChange={onChange}
      error={error}
      listClassName="grid gap-x-4 gap-y-2 sm:grid-cols-2"
    />
  );
}
