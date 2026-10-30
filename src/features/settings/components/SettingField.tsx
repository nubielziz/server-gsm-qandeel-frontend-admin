// SettingField: one typed setting of the System tab: a labelled number box with its unit, a hint, and Save. The value is checked against
// the field's range before the request (a hint); the server's own message for the key shows under the box.
import { useState } from 'react';
import { Button } from '@/components/ui';
import { settingProblem, type SettingSpec } from '../lib/system';

export interface SettingFieldProps {
  spec: SettingSpec;
  /** The saved value as text; empty when the server has not set it. */
  saved: string;
  lock: { disabled: boolean; title?: string };
  saving: boolean;
  /** The server's message for this key, or empty. */
  error: string;
  onSave: (value: number) => void;
}

/** A number setting with Save. */
export function SettingField({ spec, saved, lock, saving, error, onSave }: SettingFieldProps) {
  const [text, setText] = useState(saved);
  const [problem, setProblem] = useState('');
  const message = problem || error;

  // Save works from the box: an unchanged or invalid value never reaches the server.
  const save = () => {
    const found = settingProblem(spec, text);
    setProblem(found ?? '');
    if (!found) onSave(Number(text.trim()));
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
      <div className="min-w-0 flex-1 basis-72">
        <p className="text-sm font-medium">{spec.label}</p>
        <p className="text-xs text-ink3">{spec.hint}</p>
        <p className="mono text-2xs text-ink3">{spec.key}</p>
      </div>
      <form
        className="flex items-center gap-2 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label className="flex items-center gap-2">
          <span className="sr-only">{spec.label}</span>
          <input
            className="input w-24 text-end tabular-nums"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            placeholder="–"
            disabled={lock.disabled}
            title={lock.title}
            aria-invalid={message ? true : undefined}
            onChange={(event) => setText(event.target.value)}
          />
          <span className="text-ink3">{spec.unit}</span>
        </label>
        <Button
          type="submit"
          size="sm"
          loading={saving}
          disabled={lock.disabled || text.trim() === saved}
          title={lock.title}
        >
          Save
        </Button>
      </form>
      {message && (
        <p className="basis-full text-end text-xs text-crit-fg" role="alert">
          {message}
        </p>
      )}
    </li>
  );
}
