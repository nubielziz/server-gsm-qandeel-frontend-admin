// StorefrontHeader: the page title and its one action. Ports `pageHead` of pageStorefront in 50-p-storefront.js. The demo's
// "Preview checkout" button opened a simulated checkout; the console links to the real storefront instead (MISMATCHES M4), and
// only when `VITE_STOREFRONT_URL` says where it is.
import { ButtonLink, Icon, PageHeader } from '@/components/ui';
import { storefrontUrl } from '../lib/url';

/** Title, subtitle and the "Open the storefront" link (when the storefront's address is known). */
export function StorefrontHeader() {
  const url = storefrontUrl();
  return (
    <PageHeader
      title="Storefront"
      sub="The public site where consumers buy one unlock at a time. It sells from the same catalogue as the API, at its own prices."
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
