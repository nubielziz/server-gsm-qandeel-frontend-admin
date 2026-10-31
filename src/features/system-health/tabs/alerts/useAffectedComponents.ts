// The checked components of the platform (from the health summary), for naming the components an incident affects and for
// the picker of the "Declare incident" dialog. Ports no demo page.
import { useMemo } from 'react';
import { useHealthGrants, useSystemHealth } from '../../hooks';
import type { HealthComponent } from '../../types';

export interface AffectedComponents {
  /** Every checked component, or undefined while the summary loads, failed, or the role cannot read it. */
  components: HealthComponent[] | undefined;
  /** True during the first load of the summary. */
  loading: boolean;
  /** The component's name, or null when the key is not in the summary (a key kept as the server sent it). */
  nameOf: (key: string) => string | null;
}

/**
 * Shares the page's health read (same query key, so no extra request). The summary needs `system:read`; a role with only
 * `alerts:read` or `incidents:read` gets plain keys instead of names and the picker falls back to typed keys.
 */
export function useAffectedComponents(): AffectedComponents {
  const grants = useHealthGrants();
  const health = useSystemHealth(grants.ready && grants.can('system:read'));
  const components = health.data?.components;
  const names = useMemo(
    () => new Map((components ?? []).map((component) => [component.key, component.name])),
    [components],
  );
  return { components, loading: health.isLoading, nameOf: (key) => names.get(key) ?? null };
}
