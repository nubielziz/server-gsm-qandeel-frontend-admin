// WalletSettingsPanel: the "Customer wallet" panel of the System tab (feature 21): the master switch, the card top-up switch and the six
// whole-number limits of the store balance. Each setting is saved on its own through `PATCH /admin/settings`; the server decides what
// is valid and its message shows under the field. A key that was never set shows the server's default in the empty box.
import { Icon, Panel } from '@/components/ui';
import type { Settings } from '../types';
import { fieldText } from '../lib/system';
import { limitsWarning, switchOn, WALLET_SETTINGS } from '../lib/wallet';
import { SettingField } from './SettingField';
import { SettingSwitch } from './SettingSwitch';

export interface WalletSettingsPanelProps {
  settings: Settings | undefined;
  lock: { disabled: boolean; title?: string };
  /** The key being saved now, if any. */
  savingKey: string | undefined;
  /** The server's message per key. */
  errors: Record<string, string>;
  onSave: (key: string, value: number | boolean) => void;
}

/** Draws the eight wallet settings. */
export function WalletSettingsPanel({ settings, lock, savingKey, errors, onSave }: WalletSettingsPanelProps) {
  const warning = limitsWarning(settings);
  return (
    <Panel
      title="Customer wallet"
      sub="The store balance of storefront customers: whether it is on, and the limits on top-ups. Each one is saved on its own and written to the audit log."
      flush
    >
      <ul className="m-0 list-none divide-y divide-line p-0">
        {WALLET_SETTINGS.map((spec) =>
          spec.type === 'boolean' ? (
            <SettingSwitch
              key={spec.key}
              spec={spec}
              on={switchOn(settings, spec)}
              lock={lock}
              saving={savingKey === spec.key}
              error={errors[spec.key] ?? ''}
              onSave={(value) => onSave(spec.key, value)}
            />
          ) : (
            <SettingField
              // Starts again from the saved value after a save.
              key={`${spec.key}:${fieldText(settings, spec)}`}
              spec={spec}
              saved={fieldText(settings, spec)}
              lock={lock}
              saving={savingKey === spec.key}
              error={errors[spec.key] ?? ''}
              onSave={(value) => onSave(spec.key, value)}
            />
          ),
        )}
      </ul>
      {warning && (
        <p
          className="flex items-center gap-2 border-t border-line bg-warn-bg px-3.5 py-2.5 text-sm text-warn-fg"
          role="note"
        >
          <Icon name="alert" className="ic-sm flex-none" />
          {warning}
        </p>
      )}
    </Panel>
  );
}
