// StorefrontHeader: the title of the Shop content page and its one action. Ports `pageHead` of pageStorefront in 50-p-storefront.js. The demo's
// "Preview checkout" button opened a simulated checkout; the console links to the real storefront instead (MISMATCHES M4), and
// only when `VITE_STOREFRONT_URL` says where it is.
import { ButtonLink, Icon, PageHeader } from '@/components/ui';
import { storefrontUrl } from '../lib/url';

/** Title, subtitle and the "Open the storefront" link (when the storefront's address is known). */
export function StorefrontHeader() {
  const url = storefrontUrl();
  return (
    <PageHeader
      title="Shop content"
      sub="What the public site says: landing pages, content and legal documents, help articles, the TAC catalogue and the search tools. The services it sells and their prices are in Product / Services."
      actions={
        url && (
          <ButtonLink to={url} target="_blank" rel="noopener noreferrer">
            <Icon name="ext" className="ic-sm" />
            Open the storefront
          </ButtonLink>
        )
      }
    />
  );
}
