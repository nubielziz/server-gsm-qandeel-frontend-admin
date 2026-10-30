// PolicyRow: one line of the Policies tab: the rule, its hint, a warning when a safety rule is off, and the control (a switch or a number
// box). Ports a row of tabPolicies in 55-p-settings.js. A number is saved when the box loses focus or Enter is pressed (`st-polv`).
import { useState } from 'react';
import { Icon, Switch } from '@/components/ui';
import { isSwitchPolicy, wholeNumber, type PolicySpec } from '../lib/policies';

export interface PolicyRowProps {
  spec: PolicySpec;
  /** The saved value; undefined when the server never set it. */
  value: boolean | number | undefined;
  /** Props for the controls that change a policy (`disabled` and the reason). */
  lock: { disabled: boolean; title?: string };
  /** True while this policy is being saved. */
  saving: boolean;
  /** The server's message about this policy, or empty. */
  error: string;
  onSave: (value: boolean | number) => void;
}

/** The number box: keeps what is typed until it is saved, and says when the text is not a whole number. */
function NumberBox({ spec, value, lock, saving, error, onSave }: PolicyRowProps) {
  const [text, setText] = useState(typeof value === 'number' ? String(value) : '');
  const [hint, setHint] = useState('');
  const commit = () => {
    if (text === (typeof value === 'number' ? String(value) : '')) return;
    const number = wholeNumber(text);
    if (number === null) {
      setHint('Enter a whole number.');
      return;
    }
    setHint('');
    onSave(number);
  };
  const message = hint || error;
  return (
    <div>
      <label className="flex items-center gap-2 text-sm">
        <span className="sr-only">{spec.label}</span>
        <input
          className="input w-20 text-end tabular-nums"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder="–"
          disabled={lock.disabled || saving}
          title={lock.title}
          aria-invalid={message ? true : undefined}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
        />
        <span className="text-ink3">{spec.unit}</span>
      </label>
      {message && (
        <p className="mt-1 text-end text-xs text-crit-fg" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

/** A policy line. */
export function PolicyRow(props: PolicyRowProps) {
  const { spec, value, lock, saving, error, onSave } = props;
  const isSwitch = isSwitchPolicy(spec.key);
  const on = value === true;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
      <div className="min-w-0 flex-1 basis-72">
        <p className="text-sm font-medium">{spec.label}</p>
        <p className="text-xs text-ink3">{spec.hint}</p>
        {isSwitch && value === false && spec.warning && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-warn-fg">
            <Icon name="alert" className="ic-xs" />
            {spec.warning}
          </p>
        )}
      </div>
      {isSwitch ? (
        <div>
          <Switch
            checked={on}
            label={`${on ? 'Turn off' : 'Turn on'}: ${spec.label}`}
            disabled={lock.disabled || saving}
            title={lock.title}
            onChange={onSave}
          />
          {error && (
            <p className="mt-1 text-end text-xs text-crit-fg" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <NumberBox {...props} />
      )}
    </li>
  );
}
