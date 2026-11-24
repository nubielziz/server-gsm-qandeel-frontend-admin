// SystemTab: the "System" tab, one the demo lacks: the settings another page edits (shown with a link), the Customer wallet panel
// (feature 21, a typed form per key) and every other key as read-only JSON. `GET /admin/settings` is one flat object (assumed
// contract); each save is a `PATCH /admin/settings` with that key alone.
import { useState } from 'react';
import { Badge, ButtonLink, Panel, QueryState, SkeletonTable } from '@/components/ui';
import { useSettings } from '../hooks/useSettings';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { useSaveSystemSettings } from '../hooks/useStorefrontSettings';
import { jsonText } from '../lib/logs';
import { policyMessage } from '../lib/policies';
import { LINKED_SETTINGS, unknownSettings } from '../lib/system';
import { WalletSettingsPanel } from './WalletSettingsPanel';

/** The groups of settings. */
export function SystemTab() {
  const grants = useSettingsGrants();
  const settings = useSettings({ enabled: grants.ready && grants.can('settings:read') });
  const save = useSaveSystemSettings();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lock = grants.needs('settings:update');
  const other = unknownSettings(settings.data);

  // Saves one key; the server's refusal stays under that key until the next try.
  const saveOne = (key: string, value: number | boolean) => {
    setErrors((current) => ({ ...current, [key]: '' }));
    save.mutate(
      { [key]: value },
      {
        onError: (error) => setErrors((current) => ({ ...current, [key]: policyMessage(error, key) })),
      },
    );
  };

  return (
    <div className="grid gap-4">
      <Panel
        title="System settings"
        sub="Settings that another page edits are shown here with a link to it."
        flush
      >
        <QueryState
          isLoading={settings.isLoading}
          isError={settings.isError}
          error={settings.error}
          errorTitle="Could not load the settings"
          onRetry={() => void settings.refetch()}
          skeleton={<SkeletonTable cols={2} rows={3} />}
        >
          <ul className="m-0 list-none divide-y divide-line p-0">
            {LINKED_SETTINGS.map((setting) => (
              <li key={setting.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-3">
                <div className="min-w-0 flex-1 basis-72">
                  <p className="text-sm font-medium">{setting.label}</p>
                  <p className="text-xs text-ink3">{setting.hint}</p>
                  <p className="mono text-2xs text-ink3">{setting.key}</p>
                </div>
                <Badge tone={settings.data?.[setting.key] === true ? 'good' : 'neutral'}>
                  {settings.data?.[setting.key] === true ? 'On' : 'Off'}
                </Badge>
                <ButtonLink size="sm" to={setting.to}>
                  {setting.linkLabel}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </QueryState>
      </Panel>
      {settings.isSuccess && (
        <WalletSettingsPanel
          settings={settings.data}
          lock={lock}
          savingKey={save.isPending && save.variables ? Object.keys(save.variables)[0] : undefined}
          errors={errors}
          onSave={saveOne}
        />
      )}
      {settings.isSuccess && (
        <Panel
          title="Other settings"
          sub="Keys this console does not edit. They are shown as stored; the policies have their own tab."
        >
          {other.length === 0 ? (
            <p className="text-sm text-ink3">There are no other settings.</p>
          ) : (
            <dl className="m-0 space-y-3">
              {other.map(([key, value]) => (
                <div key={key}>
                  <dt className="mono text-sm font-medium">{key}</dt>
                  <dd className="m-0">
                    <pre className="mono mt-1 max-h-48 overflow-auto rounded-md bg-sunken p-3 text-xs">
                      {jsonText(value)}
                    </pre>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      )}
    </div>
  );
}
