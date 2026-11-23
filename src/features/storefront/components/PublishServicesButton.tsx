// PublishServicesButton: "Publish services…" above the listings table: opens the Catalog's publish view, where the staff member
// chooses what to publish and reviews a preview. It is the table's main action while the shop has no listing (then "Add listing…"
// is the default button). Publishing needs storefront:create, so without it the button is disabled and says so.
import { Button, ButtonLink, Icon } from '@/components/ui';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { storefrontPublishPath } from '../lib/paths';

export interface PublishServicesButtonProps {
  grants: StorefrontGrants;
  /** The page's main action: the ink-black button. */
  primary: boolean;
}

/** A link to the publish view, or a disabled button naming the missing permission. */
export function PublishServicesButton({ grants, primary }: PublishServicesButtonProps) {
  const lock = grants.needs('storefront:create');
  const variant = primary ? 'primary' : 'default';
  const content = (
    <>
      <Icon name="upload" className="ic-sm" />
      Publish services…
    </>
  );
  if (lock.disabled) {
    return (
      <Button variant={variant} size="sm" disabled title={lock.title}>
        {content}
      </Button>
    );
  }
  return (
    <ButtonLink variant={variant} size="sm" to={storefrontPublishPath()}>
      {content}
    </ButtonLink>
  );
}
