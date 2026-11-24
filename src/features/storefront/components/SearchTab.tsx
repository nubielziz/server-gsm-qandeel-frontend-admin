// SearchTab: the "Search" tab (backend feature 29): the state of the shop's search index with its Rebuild index button, and nothing
// else. The synonym, pinned results, report and hidden terms tools were retired (decision 025); an old `?section=` in the address
// is ignored. Needs storefront:read; Rebuild index needs storefront:publish.
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { IndexStatusPanel } from './search/IndexStatusPanel';

/** The index panel. */
export function SearchTab({ grants }: { grants: StorefrontGrants }) {
  return <IndexStatusPanel grants={grants} />;
}
