// The component the Overview tab charts, kept in the address (`?component=supplier:3`). A row sets it, and so do the
// links of the verdict. Route group `health`.
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { HealthComponent } from '../../types';
import { resolveComponent, type ResolvedComponent } from './componentRows';

/** The name of the address parameter. */
export const COMPONENT_PARAM = 'component';

export interface PickedComponent extends ResolvedComponent {
  /** Chart this component: puts its key in the address and keeps every other parameter. */
  pick: (key: string) => void;
}

/**
 * The key to chart (the address, else the default, see `resolveComponent`) and the function that changes it. Picking
 * replaces the history entry, like the range and the tabs do: Back should leave the page, not walk through every row.
 */
export function usePickedComponent(components: readonly HealthComponent[] | undefined): PickedComponent {
  const [params, setParams] = useSearchParams();
  const asked = params.get(COMPONENT_PARAM);
  const resolved = useMemo(() => resolveComponent(asked, components), [asked, components]);
  const pick = useCallback(
    (key: string) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(COMPONENT_PARAM, key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { ...resolved, pick };
}
