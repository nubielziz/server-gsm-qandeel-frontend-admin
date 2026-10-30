// PoliciesTab: the "Policies" tab: the eight storefront rules with a switch or a number each. Ports tabPolicies, `st-pol` and `st-polv` of
// 55-p-settings.js. Values come from `GET /admin/settings`; each change goes to `PATCH /admin/storefront/settings` alone, and the
// server's message for a policy shows under it.
import { useState } from 'react';
import { Panel, QueryState, SkeletonTable, toast } from '@/components/ui';
import { useSavePolicies } from '../hooks/useStorefrontSettings';
import { useSettings } from '../hooks/useSettings';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { isSwitchPolicy, policiesOf, policyMessage, POLICY_ROWS, switchToast } from '../lib/policies';
import type { PolicyKey } from '../types';
import { PolicyRow } from './PolicyRow';

/** The rules and their controls. */
export function PoliciesTab() {
  const grants = useSettingsGrants();
  const settings = useSettings({ enabled: grants.ready && grants.can('settings:read') });
  const save = useSavePolicies();
  const [errors, setErrors] = useState<Partial<Record<PolicyKey, string>>>({});
  const lock = grants.needs('settings:storefront');
  const policies = policiesOf(settings.data);

  // Saves one policy; a refusal is kept under that policy until the next try.
  const saveOne = (spec: (typeof POLICY_ROWS)[number], value: boolean | number) => {
    setErrors((current) => ({ ...current, [spec.key]: '' }));
    save.mutate(
      { [spec.key]: value },
      {
        onSuccess: () =>
          toast({
            kind: 'success',
            title: typeof value === 'boolean' ? switchToast(spec, value) : 'Saved',
            ttl: 2400,
          }),
        onError: (error) =>
          setErrors((current) => ({ ...current, [spec.key]: policyMessage(error, spec.key) })),
      },
    );
  };

  return (
    <Panel
      title="Policies"
      sub="The rules customers agree to at checkout. Changes apply to the next order and are written to the audit log."
      flush
    >
      <QueryState
        isLoading={settings.isLoading}
        isError={settings.isError}
        error={settings.error}
        errorTitle="Could not load the policies"
        onRetry={() => void settings.refetch()}
        skeleton={<SkeletonTable cols={2} rows={6} />}
      >
        <ul className="m-0 list-none divide-y divide-line p-0">
          {POLICY_ROWS.map((spec) => (
            <PolicyRow
              // A number box starts again from the saved value after a save; a switch keeps its identity, so keyboard focus stays on it.
              key={isSwitchPolicy(spec.key) ? spec.key : `${spec.key}:${String(policies[spec.key])}`}
              spec={spec}
              value={policies[spec.key]}
              lock={lock}
              saving={save.isPending && save.variables !== undefined && spec.key in save.variables}
              error={errors[spec.key] ?? ''}
              onSave={(value) => saveOne(spec, value)}
            />
          ))}
        </ul>
      </QueryState>
    </Panel>
  );
}
