// ContentTab: the "Content and legal" tab: the pages and blog panel and the legal documents panel, each shown only to a role that
// may read it (storefront:read and legal:read). Ports `tabContent` of 50-p-storefront.js.
import { EmptyState, Panel } from '@/components/ui';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { LegalPanel } from './LegalPanel';
import { PagesPanel } from './PagesPanel';

/** The two panels the role may read, one under the other. */
export function ContentTab({ grants }: { grants: StorefrontGrants }) {
  const pages = grants.can('storefront:read');
  const legal = grants.can('legal:read');
  return (
    <div className="grid gap-4">
      {pages && <PagesPanel grants={grants} />}
      {legal && <LegalPanel grants={grants} />}
      {!pages && (
        <Panel title="Pages and blog">
          <EmptyState icon="lock" title="Not available for your role">
            You need the storefront:read permission to see pages and blog posts.
          </EmptyState>
        </Panel>
      )}
      {!legal && (
        <Panel title="Legal documents">
          <EmptyState icon="lock" title="Not available for your role">
            You need the legal:read permission to see the legal documents.
          </EmptyState>
        </Panel>
      )}
    </div>
  );
}
