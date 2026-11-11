// SettingSwitch: one on/off setting of the System tab (feature 21): a labelled switch with its hint and key. It saves at once, like a
// policy switch; the server's message for the key shows under it. An unset key is off.
import { Switch } from '@/components/ui';
import type { BooleanSetting } from '../lib/system';

export interface SettingSwitchProps {
  spec: BooleanSetting;
  on: boolean;
  lock: { disabled: boolean; title?: string };
  saving: boolean;
  /** The server's message for this key, or empty. */
  error: string;
  onSave: (value: boolean) => void;
}

/** A switch setting. */
export function SettingSwitch({ spec, on, lock, saving, error, onSave }: SettingSwitchProps) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
      <div className="min-w-0 flex-1 basis-72">
        <p className="text-sm font-medium">{spec.label}</p>
        <p className="text-xs text-ink3">{spec.hint}</p>
        <p className="mono text-2xs text-ink3">{spec.key}</p>
      </div>
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
    </li>
  );
}
