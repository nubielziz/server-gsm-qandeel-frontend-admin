// ScopeSub: the muted line under a card title of the API tab: which surface the card is about and the range it covers.
import { RANGE_LABEL } from '../../lib';
import type { TimeRange } from '../../types';

export interface ScopeSubProps {
  /** The surface's name, or "All surfaces". */
  scope: string;
  /** The `?surface=` key when one is picked: shown in mono after the name, because the key is what the address uses. */
  surface?: string;
  range: TimeRange;
}

/** "Merchant API v1 (v1) · Last 24 hours". The key is left out when the name is the key itself. */
export function ScopeSub({ scope, surface, range }: ScopeSubProps) {
  return (
    <>
      {scope}
      {surface && surface !== scope && (
        <>
          {' '}
          (<span className="mono">{surface}</span>)
        </>
      )}
      {' · '}
      {RANGE_LABEL[range]}
    </>
  );
}
