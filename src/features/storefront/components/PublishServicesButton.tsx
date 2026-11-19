// PublishServicesButton: "Publish services…" on the Services on sale tab: opens the Publish tab, where the staff member chooses
// what to publish and reviews a preview. It is the page's main action while the shop has no listing (then "Add listing…" is the
// default button). The Publish tab needs storefront:create, so without it the button is disabled and says so.
import { Button, ButtonLink, Icon } from '@/components/ui';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { storefrontPublishPath } from '../lib/paths';

export interface PublishServicesButtonProps {
  grants: StorefrontGrants;
  /** The page's main action: the ink-black button. */
  primary: boolean;
}

/** A link to the Publish tab, or a disabled button naming the missing permission. */
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
